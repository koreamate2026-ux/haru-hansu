import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { signPhoneToken, signToken, verifyPhoneToken } from '../lib/jwt.js';
import { issueOtp, verifyOtp } from '../lib/otpStore.js';
import { checkPhoneRateLimit, resetPhoneRateLimit } from '../lib/phoneRateLimit.js';
import { prisma } from '../lib/prisma.js';
import { sendOtpSms } from '../lib/sms.js';
import { requireAuth } from '../middleware/auth.js';

function formatWait(ms: number): string {
  const minutes = Math.ceil(ms / 60000);
  if (minutes < 60) return `${minutes}분`;
  return `${Math.ceil(minutes / 60)}시간`;
}

export const authRouter = Router();

const phoneSchema = z
  .string()
  .transform((s) => s.replace(/[^0-9]/g, ''))
  .refine((s) => /^01[0-9]{8,9}$/.test(s), '휴대폰 번호를 다시 확인해 주세요.');

const requestOtpSchema = z.object({ phone: phoneSchema });

authRouter.post('/phone/request', async (req, res) => {
  const parsed = requestOtpSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? '휴대폰 번호를 확인해 주세요.' });
  const { phone } = parsed.data;

  const taken = await prisma.account.findUnique({ where: { phone } });
  if (taken) return res.status(409).json({ error: '이미 가입에 쓰인 번호예요.' });

  const limit = checkPhoneRateLimit(phone);
  if (!limit.ok) {
    if (limit.permanent) {
      return res.status(403).json({ error: '인증번호 요청이 너무 많아요. 관리자에게 문의하세요.' });
    }
    return res.status(429).json({ error: `인증번호를 너무 많이 요청했어요. ${formatWait(limit.retryAt - Date.now())} 후에 다시 시도해 주세요.` });
  }

  const code = issueOtp(phone);
  try {
    const result = await sendOtpSms(phone, code);
    res.json({ ok: true, devCode: result.devCode });
  } catch (e) {
    res.status(502).json({ error: e instanceof Error ? e.message : '문자를 보내지 못했어요.' });
  }
});

const verifyOtpSchema = z.object({ phone: phoneSchema, code: z.string().length(6) });

authRouter.post('/phone/verify', async (req, res) => {
  const parsed = verifyOtpSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: '입력을 확인해 주세요.' });
  const { phone, code } = parsed.data;

  const result = verifyOtp(phone, code);
  if (!result.ok) return res.status(400).json({ error: result.error });
  resetPhoneRateLimit(phone);
  res.json({ verifyToken: signPhoneToken(phone) });
});

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 해요.'),
  displayName: z.string().min(1).max(20),
  phone: phoneSchema,
  verifyToken: z.string().min(1),
});

authRouter.post('/signup', async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? '입력을 확인해 주세요.' });
  const { email, password, displayName, phone, verifyToken } = parsed.data;

  if (!verifyPhoneToken(verifyToken, phone)) {
    return res.status(400).json({ error: '휴대폰 인증을 다시 해 주세요.' });
  }

  const [existingEmail, existingPhone] = await Promise.all([
    prisma.account.findUnique({ where: { email } }),
    prisma.account.findUnique({ where: { phone } }),
  ]);
  if (existingEmail) return res.status(409).json({ error: '이미 가입된 이메일이에요.' });
  if (existingPhone) return res.status(409).json({ error: '이미 가입에 쓰인 번호예요.' });

  const passwordHash = await bcrypt.hash(password, 10);
  const account = await prisma.account.create({
    data: { email, passwordHash, displayName, phone, phoneVerifiedAt: new Date() },
  });
  const token = signToken({ accountId: account.id });
  res.status(201).json({ token, account: { id: account.id, email: account.email, displayName: account.displayName } });
});

const loginSchema = z.object({ email: z.string().email(), password: z.string() });

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: '이메일과 비밀번호를 확인해 주세요.' });
  const { email, password } = parsed.data;

  const account = await prisma.account.findUnique({ where: { email } });
  if (!account || !(await bcrypt.compare(password, account.passwordHash))) {
    return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않아요.' });
  }
  const token = signToken({ accountId: account.id });
  res.json({ token, account: { id: account.id, email: account.email, displayName: account.displayName } });
});

/**
 * 회원 탈퇴. 비밀번호를 한 번 더 확인한다.
 * 내가 만든 가족 그룹은 다른 구성원이 있으면 가장 먼저 들어온 사람에게 넘기고, 없으면 사람·번호함째 지운다.
 * 구독은 함께 지워져 더 결제되지 않고, 결제 기록은 법에 따라 남긴다(스키마에서 SetNull).
 */
authRouter.delete('/me', requireAuth, async (req, res) => {
  const parsed = z.object({ password: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: '비밀번호를 입력해 주세요.' });
  const id = req.accountId!;
  const account = await prisma.account.findUnique({ where: { id } });
  if (!account) return res.status(404).json({ error: '계정을 찾을 수 없어요.' });
  if (!(await bcrypt.compare(parsed.data.password, account.passwordHash))) {
    return res.status(401).json({ error: '비밀번호가 맞지 않아요.' });
  }

  await prisma.$transaction(async (tx) => {
    const owned = await tx.household.findMany({
      where: { ownerId: id },
      include: { members: { orderBy: { joinedAt: 'asc' } } },
    });
    for (const h of owned) {
      const next = h.members.find((m) => m.accountId !== id);
      if (next) {
        await tx.household.update({ where: { id: h.id }, data: { ownerId: next.accountId } });
        await tx.householdMember.update({ where: { id: next.id }, data: { role: 'owner' } });
      } else {
        await tx.household.delete({ where: { id: h.id } });
      }
    }
    // 가족 연동은 풀고 사람 정보는 그룹에 남긴다
    await tx.person.updateMany({ where: { linkedAccountId: id }, data: { linkedAccountId: null } });
    await tx.account.delete({ where: { id } });
  });
  res.status(204).end();
});

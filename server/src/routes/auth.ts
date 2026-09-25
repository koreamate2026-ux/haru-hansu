import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { signPhoneToken, signToken, verifyPhoneToken } from '../lib/jwt.js';
import { issueOtp, verifyOtp } from '../lib/otpStore.js';
import { prisma } from '../lib/prisma.js';
import { sendOtpSms } from '../lib/sms.js';

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

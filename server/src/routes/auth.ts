import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { signToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';

export const authRouter = Router();

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 해요.'),
  displayName: z.string().min(1).max(20),
});

authRouter.post('/signup', async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? '입력을 확인해 주세요.' });
  const { email, password, displayName } = parsed.data;

  const existing = await prisma.account.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: '이미 가입된 이메일이에요.' });

  const passwordHash = await bcrypt.hash(password, 10);
  const account = await prisma.account.create({ data: { email, passwordHash, displayName } });
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

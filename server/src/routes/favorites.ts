import { Router } from 'express';
import { z } from 'zod';
import { premiumOf } from '../lib/billing.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

/** 좋아하는 연예인·위인. 추가는 플러스 회원만, 목록 보기·지우기는 누구나(구독이 끝나도 지울 수 있게) */
export const favoritesRouter = Router();
favoritesRouter.use(requireAuth);

const MAX_FAVORITES = 10;

const favoriteSchema = z.object({
  name: z.string().trim().min(1).max(20),
  kind: z.enum(['historical', 'custom']).default('custom'),
  historicalKey: z.string().max(40).nullable().default(null),
  calendar: z.enum(['solar', 'lunar']).default('solar'),
  leapMonth: z.boolean().default(false),
  birthYear: z.number().int().min(1300).max(2100),
  birthMonth: z.number().int().min(1).max(12),
  birthDay: z.number().int().min(1).max(31),
  birthHour: z.number().int().min(0).max(23).nullable().default(null),
  birthMinute: z.number().int().min(0).max(59).default(0),
});

favoritesRouter.get('/', async (req, res) => {
  const list = await prisma.favoritePerson.findMany({ where: { accountId: req.accountId! }, orderBy: { createdAt: 'asc' } });
  res.json(list);
});

favoritesRouter.post('/', async (req, res) => {
  if (!(await premiumOf(req.accountId!))) {
    return res.status(403).json({ error: '좋아하는 사람과 연동하기는 하루 한수 플러스 기능이에요.', code: 'PLUS_ONLY' });
  }
  const parsed = favoriteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? '입력을 확인해 주세요.' });
  const count = await prisma.favoritePerson.count({ where: { accountId: req.accountId! } });
  if (count >= MAX_FAVORITES) return res.status(400).json({ error: `좋아하는 사람은 ${MAX_FAVORITES}명까지 등록할 수 있어요.` });
  const d = parsed.data;
  if (d.historicalKey) {
    const dup = await prisma.favoritePerson.findFirst({ where: { accountId: req.accountId!, historicalKey: d.historicalKey } });
    if (dup) return res.status(409).json({ error: '이미 등록한 인물이에요.' });
  }
  const created = await prisma.favoritePerson.create({ data: { ...d, accountId: req.accountId! } });
  res.status(201).json(created);
});

favoritesRouter.delete('/:id', async (req, res) => {
  const removed = await prisma.favoritePerson.deleteMany({ where: { id: req.params.id, accountId: req.accountId! } });
  if (removed.count === 0) return res.status(404).json({ error: '찾을 수 없어요.' });
  res.status(204).end();
});

import { Router } from 'express';
import { z } from 'zod';
import { premiumOf } from '../lib/billing.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const householdsRouter = Router();
householdsRouter.use(requireAuth);

const createSchema = z.object({ name: z.string().min(1).max(30) });

householdsRouter.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: '가족 그룹 이름을 확인해 주세요.' });

  const household = await prisma.household.create({
    data: {
      name: parsed.data.name,
      ownerId: req.accountId!,
      members: { create: { accountId: req.accountId!, role: 'owner' } },
      settings: { create: {} },
    },
  });
  res.status(201).json(household);
});

householdsRouter.get('/mine', async (req, res) => {
  const memberships = await prisma.householdMember.findMany({
    where: { accountId: req.accountId! },
    include: { household: { include: { persons: true } } },
  });
  // plus: 그룹을 만든 사람이 플러스라서 이 그룹은 인원 제한이 없는지
  const list = await Promise.all(
    memberships.map(async (m) => ({ ...m.household, role: m.role, plus: await premiumOf(m.household.ownerId) })),
  );
  res.json(list);
});

/** 요청자가 그 household의 멤버인지 확인. 아니면 404(존재를 노출하지 않음) */
export async function assertMember(householdId: string, accountId: string) {
  const member = await prisma.householdMember.findUnique({
    where: { householdId_accountId: { householdId, accountId } },
  });
  return member !== null;
}

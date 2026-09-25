import { Router } from 'express';
import { z } from 'zod';
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
  res.json(memberships.map((m) => ({ ...m.household, role: m.role })));
});

/** 요청자가 그 household의 멤버인지 확인. 아니면 404(존재를 노출하지 않음) */
export async function assertMember(householdId: string, accountId: string) {
  const member = await prisma.householdMember.findUnique({
    where: { householdId_accountId: { householdId, accountId } },
  });
  return member !== null;
}

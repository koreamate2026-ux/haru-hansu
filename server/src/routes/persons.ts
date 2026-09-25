import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { assertMember } from './households.js';

export const personsRouter = Router({ mergeParams: true });
personsRouter.use(requireAuth);

const personSchema = z.object({
  name: z.string().min(1).max(20),
  calendar: z.enum(['solar', 'lunar']).default('solar'),
  leapMonth: z.boolean().default(false),
  birthYear: z.number().int().min(1900).max(2100),
  birthMonth: z.number().int().min(1).max(12),
  birthDay: z.number().int().min(1).max(31),
  birthHour: z.number().int().min(0).max(23).nullable().default(null),
  birthMinute: z.number().int().min(0).max(59).default(0),
  bloodType: z.enum(['A', 'B', 'O', 'AB']).nullable().default(null),
});

async function guard(req: import('express').Request, res: import('express').Response) {
  const householdId = req.params.householdId;
  const ok = await assertMember(householdId, req.accountId!);
  if (!ok) {
    res.status(404).json({ error: '가족 그룹을 찾을 수 없어요.' });
    return null;
  }
  return householdId;
}

personsRouter.get('/', async (req, res) => {
  const householdId = await guard(req, res);
  if (!householdId) return;
  const persons = await prisma.person.findMany({ where: { householdId }, orderBy: { createdAt: 'asc' } });
  res.json(persons);
});

personsRouter.post('/', async (req, res) => {
  const householdId = await guard(req, res);
  if (!householdId) return;
  const parsed = personSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? '입력을 확인해 주세요.' });
  const person = await prisma.person.create({ data: { ...parsed.data, householdId } });
  res.status(201).json(person);
});

personsRouter.patch('/:personId', async (req, res) => {
  const householdId = await guard(req, res);
  if (!householdId) return;
  const parsed = personSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: '입력을 확인해 주세요.' });
  const existing = await prisma.person.findFirst({ where: { id: req.params.personId, householdId } });
  if (!existing) return res.status(404).json({ error: '사람을 찾을 수 없어요.' });
  const person = await prisma.person.update({ where: { id: existing.id }, data: parsed.data });
  res.json(person);
});

personsRouter.delete('/:personId', async (req, res) => {
  const householdId = await guard(req, res);
  if (!householdId) return;
  const existing = await prisma.person.findFirst({ where: { id: req.params.personId, householdId } });
  if (!existing) return res.status(404).json({ error: '사람을 찾을 수 없어요.' });
  await prisma.person.delete({ where: { id: existing.id } });
  res.status(204).end();
});

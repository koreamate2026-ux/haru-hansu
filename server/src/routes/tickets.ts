import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { assertMember } from './households.js';

export const ticketsRouter = Router({ mergeParams: true });
ticketsRouter.use(requireAuth);

const ticketSchema = z.object({
  category: z.string().min(1).max(30),
  round: z.number().int().positive(),
  numbers: z.array(z.number().int().min(1).max(45)).min(1).max(6),
  source: z.enum(['saju', 'manual']).default('saju'),
  personIds: z.array(z.string().uuid()).default([]),
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

function toDto(t: {
  id: string;
  category: string;
  round: number;
  numbers: number[];
  source: string;
  createdAt: Date;
  ticketPersons: { personId: string; person: { name: string } }[];
}) {
  return {
    id: t.id,
    category: t.category,
    round: t.round,
    numbers: t.numbers,
    source: t.source,
    createdAt: t.createdAt,
    personIds: t.ticketPersons.map((tp) => tp.personId),
    personNames: t.ticketPersons.map((tp) => tp.person.name),
  };
}

ticketsRouter.get('/', async (req, res) => {
  const householdId = await guard(req, res);
  if (!householdId) return;
  const tickets = await prisma.savedTicket.findMany({
    where: { householdId },
    include: { ticketPersons: { include: { person: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(tickets.map(toDto));
});

ticketsRouter.post('/', async (req, res) => {
  const householdId = await guard(req, res);
  if (!householdId) return;
  const parsed = ticketSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? '입력을 확인해 주세요.' });
  const { personIds, ...data } = parsed.data;
  const ticket = await prisma.savedTicket.create({
    data: {
      ...data,
      householdId,
      createdByAccountId: req.accountId,
      ticketPersons: { create: personIds.map((personId) => ({ personId })) },
    },
    include: { ticketPersons: { include: { person: true } } },
  });
  res.status(201).json(toDto(ticket));
});

ticketsRouter.delete('/:ticketId', async (req, res) => {
  const householdId = await guard(req, res);
  if (!householdId) return;
  const existing = await prisma.savedTicket.findFirst({ where: { id: req.params.ticketId, householdId } });
  if (!existing) return res.status(404).json({ error: '번호를 찾을 수 없어요.' });
  await prisma.savedTicket.delete({ where: { id: existing.id } });
  res.status(204).end();
});

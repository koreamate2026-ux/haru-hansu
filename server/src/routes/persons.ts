import { Router } from 'express';
import { z } from 'zod';
import { FREE_PERSON_LIMIT, billingEnabled, householdPlus } from '../lib/billing.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { assertMember } from './households.js';

export const personsRouter = Router({ mergeParams: true });
personsRouter.use(requireAuth);

const familyEventSchema = z.object({
  label: z.string().max(16).default(''),
  month: z.number().int().min(0).max(12).default(0),
  day: z.number().int().min(0).max(31).default(0),
});

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
  gender: z.enum(['M', 'F']).nullable().default(null),
  /** 최대 2개. 채워지지 않은 자리(월/일이 0)는 저장하지 않는다 */
  familyEvents: z.array(familyEventSchema).max(2).optional(),
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

/** familyEvents가 요청에 있으면, 그 사람의 기존 기념일을 지우고 유효한 것만 다시 넣는다 */
async function replaceFamilyEvents(householdId: string, personId: string, events: z.infer<typeof familyEventSchema>[] | undefined) {
  if (events === undefined) return;
  await prisma.familyEvent.deleteMany({ where: { personId } });
  const valid = events.filter((e) => e.month > 0 && e.day > 0);
  if (valid.length) {
    await prisma.familyEvent.createMany({
      data: valid.map((e) => ({ householdId, personId, label: e.label, month: e.month, day: e.day })),
    });
  }
}

function toDto(p: { familyEvents?: { label: string; month: number; day: number }[] } & Record<string, unknown>) {
  const { familyEvents, ...rest } = p;
  return { ...rest, familyEvents: (familyEvents ?? []).map((e) => ({ label: e.label, month: e.month, day: e.day })) };
}

personsRouter.get('/', async (req, res) => {
  const householdId = await guard(req, res);
  if (!householdId) return;
  const persons = await prisma.person.findMany({
    where: { householdId },
    include: { familyEvents: true },
    orderBy: { createdAt: 'asc' },
  });
  res.json(persons.map(toDto));
});

personsRouter.post('/', async (req, res) => {
  const householdId = await guard(req, res);
  if (!householdId) return;
  const parsed = personSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? '입력을 확인해 주세요.' });
  // 인원 제한은 그룹을 만든 사람이 플러스인지로 판단한다. 이미 한도보다 많이 등록된 그룹도
  // 기존 사람은 그대로 두고, 새로 추가할 때만 막는다. 결제가 꺼져 있으면 올릴 방법이 없으니 제한하지 않는다
  if (billingEnabled() && !(await householdPlus(householdId))) {
    const count = await prisma.person.count({ where: { householdId } });
    if (count >= FREE_PERSON_LIMIT) {
      return res.status(403).json({
        error: `무료 가족 그룹은 ${FREE_PERSON_LIMIT}명까지 등록할 수 있어요. 그룹을 만든 분이 하루 한수 플러스를 이용하면 제한 없이 추가할 수 있어요.`,
        code: 'FAMILY_LIMIT',
      });
    }
  }
  const { familyEvents, ...data } = parsed.data;
  const person = await prisma.person.create({ data: { ...data, householdId } });
  await replaceFamilyEvents(householdId, person.id, familyEvents);
  const withEvents = await prisma.person.findUniqueOrThrow({ where: { id: person.id }, include: { familyEvents: true } });
  res.status(201).json(toDto(withEvents));
});

personsRouter.patch('/:personId', async (req, res) => {
  const householdId = await guard(req, res);
  if (!householdId) return;
  const parsed = personSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: '입력을 확인해 주세요.' });
  const existing = await prisma.person.findFirst({ where: { id: req.params.personId, householdId } });
  if (!existing) return res.status(404).json({ error: '사람을 찾을 수 없어요.' });
  const { familyEvents, ...data } = parsed.data;
  const person = await prisma.person.update({ where: { id: existing.id }, data });
  await replaceFamilyEvents(householdId, person.id, familyEvents);
  const withEvents = await prisma.person.findUniqueOrThrow({ where: { id: person.id }, include: { familyEvents: true } });
  res.json(toDto(withEvents));
});

personsRouter.delete('/:personId', async (req, res) => {
  const householdId = await guard(req, res);
  if (!householdId) return;
  const existing = await prisma.person.findFirst({ where: { id: req.params.personId, householdId } });
  if (!existing) return res.status(404).json({ error: '사람을 찾을 수 없어요.' });
  await prisma.person.delete({ where: { id: existing.id } });
  res.status(204).end();
});

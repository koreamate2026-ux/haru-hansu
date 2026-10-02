import { randomInt } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { FREE_PERSON_LIMIT, billingEnabled, householdPlus, premiumOf } from '../lib/billing.js';
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

// ─── 초대 ─────────────────────────────────────────────

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** 헷갈리는 글자(0/O, 1/I/L)를 뺀 32자 × 6자리 */
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const makeCode = () => Array.from({ length: 6 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join('');

/** 코드 맞히기 시도를 막으려고 계정마다 한 시간에 틀린 코드 10번까지만 */
const joinFails = new Map<string, { count: number; since: number }>();
const JOIN_FAIL_LIMIT = 10;
const JOIN_FAIL_WINDOW_MS = 60 * 60 * 1000;

export async function roleOf(householdId: string, accountId: string) {
  const m = await prisma.householdMember.findUnique({ where: { householdId_accountId: { householdId, accountId } } });
  return m?.role ?? null;
}

householdsRouter.post('/:householdId/invites', async (req, res) => {
  const { householdId } = req.params;
  if ((await roleOf(householdId, req.accountId!)) !== 'owner') {
    return res.status(403).json({ error: '가족 그룹을 만든 분만 초대할 수 있어요.' });
  }
  const parsed = z.object({ personId: z.string().uuid().nullable().optional() }).safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: '초대할 사람을 확인해 주세요.' });
  const personId = parsed.data.personId ?? null;
  if (personId) {
    const person = await prisma.person.findFirst({ where: { id: personId, householdId } });
    if (!person) return res.status(404).json({ error: '초대할 사람을 찾을 수 없어요.' });
    if (person.linkedAccountId) return res.status(409).json({ error: `${person.name} 님은 이미 계정과 연동되어 있어요.` });
  }
  for (let i = 0; i < 5; i++) {
    const code = makeCode();
    try {
      const invite = await prisma.householdInvite.create({
        data: { code, householdId, personId, createdById: req.accountId!, expiresAt: new Date(Date.now() + INVITE_TTL_MS) },
      });
      return res.status(201).json({ id: invite.id, code: invite.code, expiresAt: invite.expiresAt, personId: invite.personId });
    } catch {
      // 드물게 코드가 겹치면 다시 만든다
    }
  }
  res.status(500).json({ error: '초대 코드를 만들지 못했어요. 다시 시도해 주세요.' });
});

/** 초대 현황(그룹을 만든 사람만): 최근 20개 */
householdsRouter.get('/:householdId/invites', async (req, res) => {
  const { householdId } = req.params;
  if ((await roleOf(householdId, req.accountId!)) !== 'owner') return res.status(403).json({ error: '가족 그룹을 만든 분만 볼 수 있어요.' });
  const invites = await prisma.householdInvite.findMany({ where: { householdId }, orderBy: { createdAt: 'desc' }, take: 20 });
  const personIds = invites.map((i) => i.personId).filter((x): x is string => Boolean(x));
  const accountIds = invites.map((i) => i.usedById).filter((x): x is string => Boolean(x));
  const [persons, accounts] = await Promise.all([
    prisma.person.findMany({ where: { id: { in: personIds } }, select: { id: true, name: true } }),
    prisma.account.findMany({ where: { id: { in: accountIds } }, select: { id: true, displayName: true } }),
  ]);
  const now = Date.now();
  res.json(
    invites.map((i) => ({
      id: i.id,
      code: i.code,
      personId: i.personId,
      personName: persons.find((p) => p.id === i.personId)?.name ?? null,
      status: i.usedAt ? 'used' : i.expiresAt.getTime() < now ? 'expired' : 'active',
      usedByName: accounts.find((a) => a.id === i.usedById)?.displayName ?? null,
      expiresAt: i.expiresAt,
      createdAt: i.createdAt,
    })),
  );
});

/** 아직 안 쓴 초대 취소(그룹을 만든 사람만) */
householdsRouter.delete('/:householdId/invites/:inviteId', async (req, res) => {
  const { householdId, inviteId } = req.params;
  if ((await roleOf(householdId, req.accountId!)) !== 'owner') return res.status(403).json({ error: '가족 그룹을 만든 분만 취소할 수 있어요.' });
  const removed = await prisma.householdInvite.deleteMany({ where: { id: inviteId, householdId, usedAt: null } });
  if (removed.count === 0) return res.status(404).json({ error: '취소할 초대를 찾을 수 없어요.' });
  res.status(204).end();
});

const normalizeCode = (raw: string) => raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

/** 초대 링크를 연 사람에게 보여 줄 정보. 그룹 이름·만든 사람·초대받은 사람 이름만 알려 준다 */
householdsRouter.get('/invites/:code', async (req, res) => {
  const me = req.accountId!;
  const now = Date.now();
  const f = joinFails.get(me);
  if (f && now - f.since < JOIN_FAIL_WINDOW_MS && f.count >= JOIN_FAIL_LIMIT) {
    return res.status(429).json({ error: '초대 코드를 너무 여러 번 틀렸어요. 한 시간 뒤에 다시 시도해 주세요.' });
  }
  const invite = await prisma.householdInvite.findUnique({
    where: { code: normalizeCode(req.params.code) },
    include: { household: { include: { owner: { select: { displayName: true } } } } },
  });
  if (!invite) {
    const cur = f && now - f.since < JOIN_FAIL_WINDOW_MS ? f : { count: 0, since: now };
    joinFails.set(me, { count: cur.count + 1, since: cur.since });
    return res.status(404).json({ error: '없는 초대 코드예요. 다시 확인해 주세요.' });
  }
  const person = invite.personId ? await prisma.person.findUnique({ where: { id: invite.personId }, select: { name: true } }) : null;
  res.json({
    householdId: invite.householdId,
    householdName: invite.household.name,
    ownerName: invite.household.owner.displayName,
    personName: person?.name ?? null,
    status: invite.usedAt ? 'used' : invite.expiresAt.getTime() < now ? 'expired' : 'active',
    alreadyMember: Boolean(await roleOf(invite.householdId, me)),
  });
});

householdsRouter.post('/join', async (req, res) => {
  const parsed = z.object({ code: z.string().min(1).max(20) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: '초대 코드를 확인해 주세요.' });
  const me = req.accountId!;

  const now = Date.now();
  const f = joinFails.get(me);
  if (f && now - f.since < JOIN_FAIL_WINDOW_MS && f.count >= JOIN_FAIL_LIMIT) {
    return res.status(429).json({ error: '초대 코드를 너무 여러 번 틀렸어요. 한 시간 뒤에 다시 시도해 주세요.' });
  }
  const fail = (status: number, error: string) => {
    const cur = f && now - f.since < JOIN_FAIL_WINDOW_MS ? f : { count: 0, since: now };
    joinFails.set(me, { count: cur.count + 1, since: cur.since });
    return res.status(status).json({ error });
  };

  const code = normalizeCode(parsed.data.code);
  const invite = await prisma.householdInvite.findUnique({ where: { code }, include: { household: true } });
  if (!invite) return fail(404, '없는 초대 코드예요. 다시 확인해 주세요.');
  if (invite.usedAt) return fail(410, '이미 사용한 초대 코드예요. 새 코드를 받아 주세요.');
  if (invite.expiresAt.getTime() < now) return fail(410, '기간이 지난 초대 코드예요. 새 코드를 받아 주세요.');

  if (await roleOf(invite.householdId, me)) {
    return res.status(409).json({ error: '이미 이 가족 그룹에 들어가 있어요.' });
  }
  // 동시에 두 명이 같은 코드를 쓰는 것을 막기 위해 "아직 안 쓴 코드"일 때만 사용 처리
  const claimed = await prisma.householdInvite.updateMany({
    where: { id: invite.id, usedAt: null },
    data: { usedAt: new Date(), usedById: me },
  });
  if (claimed.count === 0) return fail(410, '이미 사용한 초대 코드예요. 새 코드를 받아 주세요.');

  await prisma.householdMember.create({ data: { householdId: invite.householdId, accountId: me, role: 'member' } });
  joinFails.delete(me);
  // 초대할 때 골라 둔 사람이 아직 비어 있으면 참여 화면에서 미리 선택해 둔다(연결은 본인이 확인한 뒤에)
  const invited = invite.personId
    ? await prisma.person.findFirst({ where: { id: invite.personId, householdId: invite.householdId, linkedAccountId: null }, select: { id: true } })
    : null;
  res.status(201).json({ id: invite.household.id, name: invite.household.name, invitedPersonId: invited?.id ?? null });
});

householdsRouter.get('/:householdId/members', async (req, res) => {
  const { householdId } = req.params;
  if (!(await roleOf(householdId, req.accountId!))) return res.status(404).json({ error: '가족 그룹을 찾을 수 없어요.' });
  const members = await prisma.householdMember.findMany({
    where: { householdId },
    include: { account: { select: { displayName: true } } },
    orderBy: { joinedAt: 'asc' },
  });
  const linked = await prisma.person.findMany({ where: { householdId, linkedAccountId: { not: null } }, select: { id: true, name: true, linkedAccountId: true, shareSaju: true } });
  res.json(
    members.map((m) => ({
      accountId: m.accountId,
      displayName: m.account.displayName,
      linkedPersonId: linked.find((p) => p.linkedAccountId === m.accountId)?.id ?? null,
      linkedPersonName: linked.find((p) => p.linkedAccountId === m.accountId)?.name ?? null,
      sajuShared: linked.find((p) => p.linkedAccountId === m.accountId)?.shareSaju ?? null,
      role: m.role,
      joinedAt: m.joinedAt,
      isMe: m.accountId === req.accountId,
    })),
  );
});

/** 그룹을 만든 사람은 다른 구성원을 내보낼 수 있고, 구성원은 스스로 나갈 수 있다 */
householdsRouter.delete('/:householdId/members/:accountId', async (req, res) => {
  const { householdId, accountId } = req.params;
  const myRole = await roleOf(householdId, req.accountId!);
  if (!myRole) return res.status(404).json({ error: '가족 그룹을 찾을 수 없어요.' });
  const self = accountId === req.accountId;
  if (self && myRole === 'owner') {
    return res.status(400).json({ error: '가족 그룹을 만든 분은 나갈 수 없어요.' });
  }
  if (!self && myRole !== 'owner') return res.status(403).json({ error: '가족 그룹을 만든 분만 내보낼 수 있어요.' });
  const removed = await prisma.householdMember.deleteMany({ where: { householdId, accountId, role: 'member' } });
  if (removed.count === 0) return res.status(404).json({ error: '구성원을 찾을 수 없어요.' });
  // 그 사람의 정보와 번호는 그룹에 남기고 계정 연결만 푼다
  await prisma.person.updateMany({ where: { householdId, linkedAccountId: accountId }, data: { linkedAccountId: null, shareSaju: null } });
  res.status(204).end();
});

// ─── 사람과 계정 연결(가족 연동) ─────────────────────────

/** 이 사람이 나예요: 그룹 안에서 나와 연결된 다른 사람이 있으면 그 연결은 푼다 */
householdsRouter.post('/:householdId/persons/:personId/link', async (req, res) => {
  const { householdId, personId } = req.params;
  const me = req.accountId!;
  if (!(await roleOf(householdId, me))) return res.status(404).json({ error: '가족 그룹을 찾을 수 없어요.' });
  const person = await prisma.person.findFirst({ where: { id: personId, householdId } });
  if (!person) return res.status(404).json({ error: '사람을 찾을 수 없어요.' });
  if (person.linkedAccountId && person.linkedAccountId !== me) {
    return res.status(409).json({ error: `${person.name} 님은 이미 다른 계정과 연동되어 있어요.` });
  }
  await prisma.$transaction([
    prisma.person.updateMany({ where: { householdId, linkedAccountId: me, NOT: { id: personId } }, data: { linkedAccountId: null, shareSaju: null } }),
    prisma.person.update({ where: { id: personId }, data: { linkedAccountId: me, ...(person.linkedAccountId === me ? {} : { shareSaju: null }) } }),
  ]);
  res.status(204).end();
});

/** 연결 풀기: 본인 또는 그룹을 만든 사람 */
householdsRouter.delete('/:householdId/persons/:personId/link', async (req, res) => {
  const { householdId, personId } = req.params;
  const me = req.accountId!;
  const role = await roleOf(householdId, me);
  if (!role) return res.status(404).json({ error: '가족 그룹을 찾을 수 없어요.' });
  const person = await prisma.person.findFirst({ where: { id: personId, householdId } });
  if (!person) return res.status(404).json({ error: '사람을 찾을 수 없어요.' });
  if (person.linkedAccountId !== me && role !== 'owner') return res.status(403).json({ error: '본인이나 가족 그룹을 만든 분만 연동을 풀 수 있어요.' });
  await prisma.person.update({ where: { id: personId }, data: { linkedAccountId: null, shareSaju: null } });
  res.status(204).end();
});

/** 내 사주를 가족과 함께 볼지: 그 사람과 연동된 본인만 정한다 */
householdsRouter.patch('/:householdId/persons/:personId/share', async (req, res) => {
  const { householdId, personId } = req.params;
  const me = req.accountId!;
  if (!(await roleOf(householdId, me))) return res.status(404).json({ error: '가족 그룹을 찾을 수 없어요.' });
  const parsed = z.object({ share: z.boolean() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: '선택을 확인해 주세요.' });
  const updated = await prisma.person.updateMany({ where: { id: personId, householdId, linkedAccountId: me }, data: { shareSaju: parsed.data.share } });
  if (updated.count === 0) return res.status(403).json({ error: '본인 사주만 공유 여부를 정할 수 있어요.' });
  res.status(204).end();
});

// ─── 원래 쓰던 데이터 가져오기 ───────────────────────────

const birthKey = (p: { name: string; calendar: string; birthYear: number; birthMonth: number; birthDay: number }) =>
  `${p.name.trim()}|${p.calendar}|${p.birthYear}-${p.birthMonth}-${p.birthDay}`;

/**
 * 내가 만든 다른 그룹의 사람·기념일·번호함을 이 그룹으로 복사한다(원본은 그대로 둔다).
 * 이름·생년월일이 같은 사람은 새로 만들지 않고 합친다. 같은 회차·같은 번호는 한 번만 옮긴다.
 */
householdsRouter.post('/:householdId/import', async (req, res) => {
  const { householdId } = req.params;
  const me = req.accountId!;
  const parsed = z.object({ fromHouseholdId: z.string().uuid() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: '가져올 그룹을 확인해 주세요.' });
  const from = parsed.data.fromHouseholdId;
  if (from === householdId) return res.status(400).json({ error: '같은 그룹이에요.' });
  if (!(await roleOf(householdId, me))) return res.status(404).json({ error: '가족 그룹을 찾을 수 없어요.' });
  if ((await roleOf(from, me)) !== 'owner') return res.status(403).json({ error: '내가 만든 그룹의 데이터만 가져올 수 있어요.' });

  const [srcPersons, dstPersons, srcTickets, dstTickets] = await Promise.all([
    prisma.person.findMany({ where: { householdId: from }, include: { familyEvents: true }, orderBy: { createdAt: 'asc' } }),
    prisma.person.findMany({ where: { householdId } }),
    prisma.savedTicket.findMany({ where: { householdId: from }, include: { ticketPersons: true } }),
    prisma.savedTicket.findMany({ where: { householdId }, select: { round: true, numbers: true } }),
  ]);
  const existingByKey = new Map(dstPersons.map((p) => [birthKey(p), p.id]));
  const toCreate = srcPersons.filter((p) => !existingByKey.has(birthKey(p)));

  if (billingEnabled() && !(await householdPlus(householdId)) && dstPersons.length + toCreate.length > FREE_PERSON_LIMIT) {
    return res.status(403).json({
      error: `무료 가족 그룹은 ${FREE_PERSON_LIMIT}명까지라 모두 가져올 수 없어요. 그룹을 만든 분이 하루 한수 플러스를 이용하면 제한 없이 가져올 수 있어요.`,
      code: 'FAMILY_LIMIT',
    });
  }

  const ticketKey = (t: { round: number; numbers: number[] }) => `${t.round}|${[...t.numbers].sort((a, b) => a - b).join(',')}`;
  const seenTickets = new Set(dstTickets.map(ticketKey));

  const result = await prisma.$transaction(async (tx) => {
    const idMap = new Map<string, string>();
    for (const p of srcPersons) {
      const same = existingByKey.get(birthKey(p));
      if (same) {
        idMap.set(p.id, same);
        continue;
      }
      const created = await tx.person.create({
        data: {
          householdId,
          name: p.name,
          calendar: p.calendar,
          leapMonth: p.leapMonth,
          birthYear: p.birthYear,
          birthMonth: p.birthMonth,
          birthDay: p.birthDay,
          birthHour: p.birthHour,
          birthMinute: p.birthMinute,
          bloodType: p.bloodType,
          gender: p.gender,
          createdByAccountId: me,
          // 원래 그룹에서 나와 연결된 사람(=나)은 여기서도 나와 연결한다
          linkedAccountId: p.linkedAccountId === me && !dstPersons.some((d) => d.linkedAccountId === me) ? me : null,
        },
      });
      idMap.set(p.id, created.id);
      if (p.familyEvents.length) {
        await tx.familyEvent.createMany({
          data: p.familyEvents.map((e) => ({ householdId, personId: created.id, label: e.label, month: e.month, day: e.day })),
        });
      }
    }
    let tickets = 0;
    for (const t of srcTickets) {
      const key = ticketKey(t);
      if (seenTickets.has(key)) continue;
      seenTickets.add(key);
      await tx.savedTicket.create({
        data: {
          householdId,
          category: t.category,
          round: t.round,
          numbers: t.numbers,
          source: t.source,
          createdByAccountId: me,
          createdAt: t.createdAt,
          ticketPersons: { create: t.ticketPersons.map((tp) => idMap.get(tp.personId)).filter((x): x is string => Boolean(x)).map((personId) => ({ personId })) },
        },
      });
      tickets++;
    }
    return { persons: toCreate.length, merged: srcPersons.length - toCreate.length, tickets };
  });
  res.json(result);
});

// ─── 가족 궁합 관계·사주 계산 설정(그룹이 함께 씀) ─────────────────

const REL_VALUES = ['mother', 'father', 'parent', 'spouse', 'child', 'sibling', 'grandparent', 'grandchild', 'friend', 'other'] as const;

householdsRouter.get('/:householdId/relations', async (req, res) => {
  const { householdId } = req.params;
  if (!(await roleOf(householdId, req.accountId!))) return res.status(404).json({ error: '가족 그룹을 찾을 수 없어요.' });
  const list = await prisma.personRelation.findMany({ where: { householdId }, select: { fromPersonId: true, toPersonId: true, rel: true } });
  res.json(list);
});

/** 관계 정하기(rel이 null이면 지우기). 같은 쌍의 반대 방향 기록은 지워서 한 줄만 남긴다 */
householdsRouter.put('/:householdId/relations', async (req, res) => {
  const { householdId } = req.params;
  if (!(await roleOf(householdId, req.accountId!))) return res.status(404).json({ error: '가족 그룹을 찾을 수 없어요.' });
  const parsed = z
    .object({ fromPersonId: z.string().uuid(), toPersonId: z.string().uuid(), rel: z.enum(REL_VALUES).nullable() })
    .safeParse(req.body);
  if (!parsed.success || parsed.data.fromPersonId === parsed.data.toPersonId) return res.status(400).json({ error: '관계를 확인해 주세요.' });
  const { fromPersonId, toPersonId, rel } = parsed.data;
  const count = await prisma.person.count({ where: { householdId, id: { in: [fromPersonId, toPersonId] } } });
  if (count !== 2) return res.status(404).json({ error: '사람을 찾을 수 없어요.' });
  await prisma.$transaction(async (tx) => {
    await tx.personRelation.deleteMany({ where: { fromPersonId: toPersonId, toPersonId: fromPersonId } });
    if (rel) {
      await tx.personRelation.upsert({
        where: { fromPersonId_toPersonId: { fromPersonId, toPersonId } },
        create: { householdId, fromPersonId, toPersonId, rel },
        update: { rel },
      });
    } else {
      await tx.personRelation.deleteMany({ where: { fromPersonId, toPersonId } });
    }
  });
  res.status(204).end();
});

householdsRouter.get('/:householdId/settings', async (req, res) => {
  const { householdId } = req.params;
  if (!(await roleOf(householdId, req.accountId!))) return res.status(404).json({ error: '가족 그룹을 찾을 수 없어요.' });
  const s = await prisma.householdSettings.upsert({ where: { householdId }, create: { householdId }, update: {} });
  res.json({ trueSolarTime: s.trueSolarTime });
});

/** 사주 계산 기준은 그룹을 만든 사람만 바꾼다 */
householdsRouter.patch('/:householdId/settings', async (req, res) => {
  const { householdId } = req.params;
  if ((await roleOf(householdId, req.accountId!)) !== 'owner') return res.status(403).json({ error: '가족 그룹을 만든 분만 바꿀 수 있어요.' });
  const parsed = z.object({ trueSolarTime: z.boolean() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: '설정을 확인해 주세요.' });
  const s = await prisma.householdSettings.upsert({
    where: { householdId },
    create: { householdId, trueSolarTime: parsed.data.trueSolarTime },
    update: { trueSolarTime: parsed.data.trueSolarTime },
  });
  res.json({ trueSolarTime: s.trueSolarTime });
});

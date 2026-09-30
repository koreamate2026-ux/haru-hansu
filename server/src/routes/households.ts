import { randomInt } from 'node:crypto';
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

// ─── 초대 ─────────────────────────────────────────────

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** 헷갈리는 글자(0/O, 1/I/L)를 뺀 32자 × 6자리 */
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const makeCode = () => Array.from({ length: 6 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join('');

/** 코드 맞히기 시도를 막으려고 계정마다 한 시간에 틀린 코드 10번까지만 */
const joinFails = new Map<string, { count: number; since: number }>();
const JOIN_FAIL_LIMIT = 10;
const JOIN_FAIL_WINDOW_MS = 60 * 60 * 1000;

async function roleOf(householdId: string, accountId: string) {
  const m = await prisma.householdMember.findUnique({ where: { householdId_accountId: { householdId, accountId } } });
  return m?.role ?? null;
}

householdsRouter.post('/:householdId/invites', async (req, res) => {
  const { householdId } = req.params;
  if ((await roleOf(householdId, req.accountId!)) !== 'owner') {
    return res.status(403).json({ error: '가족 그룹을 만든 분만 초대할 수 있어요.' });
  }
  for (let i = 0; i < 5; i++) {
    const code = makeCode();
    try {
      const invite = await prisma.householdInvite.create({
        data: { code, householdId, createdById: req.accountId!, expiresAt: new Date(Date.now() + INVITE_TTL_MS) },
      });
      return res.status(201).json({ code: invite.code, expiresAt: invite.expiresAt });
    } catch {
      // 드물게 코드가 겹치면 다시 만든다
    }
  }
  res.status(500).json({ error: '초대 코드를 만들지 못했어요. 다시 시도해 주세요.' });
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

  const code = parsed.data.code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
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
  res.status(201).json({ id: invite.household.id, name: invite.household.name });
});

householdsRouter.get('/:householdId/members', async (req, res) => {
  const { householdId } = req.params;
  if (!(await roleOf(householdId, req.accountId!))) return res.status(404).json({ error: '가족 그룹을 찾을 수 없어요.' });
  const members = await prisma.householdMember.findMany({
    where: { householdId },
    include: { account: { select: { displayName: true } } },
    orderBy: { joinedAt: 'asc' },
  });
  res.json(
    members.map((m) => ({
      accountId: m.accountId,
      displayName: m.account.displayName,
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
  res.status(204).end();
});

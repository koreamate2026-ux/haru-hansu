import { randomUUID } from 'node:crypto';
import type { Subscription, SubscriptionPayment } from '@prisma/client';
import { prisma } from './prisma.js';
import { open, seal } from './secretBox.js';
import { sendSms } from './sms.js';

/**
 * 하루 한수 플러스(개인 구독) — 토스페이먼츠 자동결제(빌링).
 * TOSS_CLIENT_KEY / TOSS_SECRET_KEY가 없으면 구독 기능 전체가 꺼진다.
 * 흐름: 카드 등록(authKey) → 빌링키 발급 → 첫 기간 결제 → 매시간 만료된 구독을 갱신 결제.
 */
export const PLANS = {
  monthly: { amount: 1900, months: 1, name: '하루 한수 플러스 (월간)', label: '월간' },
  yearly: { amount: 19000, months: 12, name: '하루 한수 플러스 (연간)', label: '연간' },
} as const;
export type PlanId = keyof typeof PLANS;
export const isPlanId = (v: unknown): v is PlanId => v === 'monthly' || v === 'yearly';

/** 무료 가족 그룹(그룹을 만든 사람이 플러스가 아님)에 등록할 수 있는 사람 수(본인 포함) */
export const FREE_PERSON_LIMIT = 2;

/** 결제 후 이 기간 안에는 전액 환불(청약철회) */
export const FULL_REFUND_DAYS = 7;
/** 연간 요금제 갱신 며칠 전에 안내 문자를 보낼지 */
const YEARLY_NOTICE_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RETRY = 3;
const RETRY_GAP_MS = DAY_MS;
/** 서버가 오래 멈춰 있다가 켜졌을 때, 이미 지나간 기간을 소급 청구하지 않도록 */
const MAX_BACKDATE_MS = 3 * DAY_MS;
/** 첫 결제 도중 서버가 멈춘 건을 되짚기 전에 기다리는 시간(진행 중인 결제와 겹치지 않게) */
const PENDING_RECHECK_MS = 10 * 60 * 1000;

const CLIENT_KEY = process.env.TOSS_CLIENT_KEY;
const SECRET_KEY = process.env.TOSS_SECRET_KEY;

export const billingEnabled = () => Boolean(CLIENT_KEY && SECRET_KEY);
export const tossClientKey = () => CLIENT_KEY ?? null;

export class TossError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

async function toss<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const res = await fetch(`https://api.tosspayments.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${SECRET_KEY}:`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as { code?: string; message?: string } & T;
  if (!res.ok) throw new TossError(json.code ?? 'UNKNOWN', json.message ?? '결제 요청이 실패했어요.');
  return json;
}

/** 1월 31일 + 1개월이 3월 3일이 되지 않도록 말일로 맞춘다 */
export function addMonths(d: Date, n: number): Date {
  const r = new Date(d.getTime());
  const day = r.getUTCDate();
  r.setUTCDate(1);
  r.setUTCMonth(r.getUTCMonth() + n);
  const last = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate();
  r.setUTCDate(Math.min(day, last));
  return r;
}

const kstDate = (d: Date) => {
  const k = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return `${k.getUTCMonth() + 1}월 ${k.getUTCDate()}일`;
};
const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

/** 지금 플러스 혜택을 받는지. 갱신 결제를 재시도하는 동안(past_due)은 혜택을 유지한다 */
export function isPremium(sub: Pick<Subscription, 'status' | 'currentPeriodEnd' | 'cancelAtPeriodEnd'> | null): boolean {
  if (!sub) return false;
  if (sub.status === 'past_due') return true;
  if (sub.status !== 'active' || !sub.currentPeriodEnd) return false;
  // 해지 예약이면 기간 끝까지만. 아니면 갱신 배치가 돌기 전 잠깐의 틈에도 혜택 유지
  return sub.cancelAtPeriodEnd ? sub.currentPeriodEnd.getTime() > Date.now() : true;
}

export async function premiumOf(accountId: string): Promise<boolean> {
  return isPremium(await prisma.subscription.findUnique({ where: { accountId } }));
}

/** 가족 그룹의 인원 제한은 그룹을 만든 사람의 구독으로 판단한다 */
export async function householdPlus(householdId: string): Promise<boolean> {
  const h = await prisma.household.findUnique({ where: { id: householdId }, select: { ownerId: true } });
  return h ? premiumOf(h.ownerId) : false;
}

export async function getOrCreateSubscription(accountId: string): Promise<Subscription> {
  const existing = await prisma.subscription.findUnique({ where: { accountId } });
  if (existing) return existing;
  return prisma.subscription.create({ data: { accountId, customerKey: `hh_${randomUUID()}` } });
}

export async function issueBillingKey(authKey: string, customerKey: string): Promise<string> {
  const r = await toss<{ billingKey: string }>('POST', '/billing/authorizations/issue', { authKey, customerKey });
  return r.billingKey;
}

export const sealBillingKey = seal;

interface ChargeInput {
  sub: Subscription;
  plan: PlanId;
  orderId: string;
  periodStart: Date;
  customer: { email: string; name: string };
}

async function findPaidOrder(orderId: string) {
  try {
    const found = await toss<{ status: string; paymentKey: string; approvedAt?: string }>(
      'GET',
      `/payments/orders/${encodeURIComponent(orderId)}`,
    );
    return found.status === 'DONE' ? found : null;
  } catch {
    return null;
  }
}

/**
 * 한 기간을 결제하고 기록한다. 결제 요청이 실패로 끝났더라도 이미 승인됐을 수 있으니(응답 유실 등)
 * 주문번호로 한 번 더 조회해서 확인한다.
 */
export async function chargePeriod({ sub, plan, orderId, periodStart, customer }: ChargeInput) {
  const p = PLANS[plan];
  const periodEnd = addMonths(periodStart, p.months);
  let paymentKey: string | null = null;
  let failReason: string | null = null;
  try {
    if (!sub.billingKey) throw new Error('등록된 카드가 없어요.');
    const r = await toss<{ status: string; paymentKey: string }>('POST', `/billing/${open(sub.billingKey)}`, {
      customerKey: sub.customerKey,
      amount: p.amount,
      orderId,
      orderName: p.name,
      customerEmail: customer.email,
      customerName: customer.name,
    });
    if (r.status === 'DONE') paymentKey = r.paymentKey;
    else failReason = `결제 상태: ${r.status}`;
  } catch (e) {
    failReason = e instanceof Error ? e.message : '결제에 실패했어요.';
    const found = await findPaidOrder(orderId);
    if (found) {
      paymentKey = found.paymentKey;
      failReason = null;
    }
  }

  await prisma.subscriptionPayment.upsert({
    where: { orderId },
    create: {
      subscriptionId: sub.id,
      orderId,
      plan,
      amount: p.amount,
      status: paymentKey ? 'paid' : 'failed',
      paymentKey,
      failReason,
      periodStart,
      periodEnd,
    },
    update: { status: paymentKey ? 'paid' : 'failed', paymentKey, failReason },
  });

  return { ok: Boolean(paymentKey), periodEnd, failReason };
}

const shortId = (id: string) => id.replace(/-/g, '').slice(0, 12);
const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');

export const firstOrderId = (sub: Subscription) => `plus-${shortId(sub.id)}-${randomUUID().replace(/-/g, '').slice(0, 12)}`;
/** 같은 기간·같은 시도 차수에는 항상 같은 주문번호 → 토스가 중복 결제를 막아 준다 */
const renewalOrderId = (sub: Subscription, periodStart: Date, attempt: number) => `plus-${shortId(sub.id)}-${ymd(periodStart)}-r${attempt}`;

async function notify(phone: string | null, text: string) {
  if (!phone) return;
  try {
    await sendSms(phone, `[하루 한수] ${text}`);
  } catch (e) {
    console.error('[billing] 안내 문자 실패', e);
  }
}

async function expire(subId: string) {
  await prisma.subscription.update({
    where: { id: subId },
    data: { status: 'expired', billingKey: null, cancelAtPeriodEnd: false, nextPlan: null, pendingOrderId: null },
  });
}

// ─── 환불 ─────────────────────────────────────────────

export interface RefundQuote {
  refundable: boolean;
  amount: number;
  reason: string;
}

/** 시작일부터 지금까지 시작된 달 수(방금 시작했으면 1) */
function startedMonths(start: Date, now: Date): number {
  let m = 0;
  while (addMonths(start, m).getTime() <= now.getTime()) m += 1;
  return m;
}

export function refundQuote(lastPaid: SubscriptionPayment | null, now = new Date()): RefundQuote {
  if (!lastPaid || lastPaid.status !== 'paid' || !lastPaid.paymentKey || !isPlanId(lastPaid.plan)) {
    return { refundable: false, amount: 0, reason: '환불할 수 있는 결제가 없어요.' };
  }
  if (now.getTime() - lastPaid.createdAt.getTime() <= FULL_REFUND_DAYS * DAY_MS) {
    return { refundable: true, amount: lastPaid.amount, reason: `결제한 지 ${FULL_REFUND_DAYS}일이 지나지 않아 전액 환불돼요.` };
  }
  if (lastPaid.plan === 'yearly') {
    const used = startedMonths(lastPaid.periodStart, now);
    const amount = Math.max(0, lastPaid.amount - used * PLANS.monthly.amount);
    return amount > 0
      ? { refundable: true, amount, reason: `이용한 ${used}개월(월 ${won(PLANS.monthly.amount)} 기준)을 빼고 환불돼요.` }
      : { refundable: false, amount: 0, reason: '이용한 기간을 빼면 환불할 금액이 없어요.' };
  }
  return {
    refundable: false,
    amount: 0,
    reason: `월간 요금제는 결제 후 ${FULL_REFUND_DAYS}일이 지나면 환불되지 않아요. 해지하면 남은 기간까지 이용할 수 있어요.`,
  };
}

export async function lastPaidPayment(subscriptionId: string) {
  return prisma.subscriptionPayment.findFirst({
    where: { subscriptionId, status: 'paid' },
    orderBy: { createdAt: 'desc' },
  });
}

/** 환불하고 구독을 바로 끝낸다 */
export async function refund(sub: Subscription & { account: { phone: string | null } }): Promise<RefundQuote> {
  const last = await lastPaidPayment(sub.id);
  const quote = refundQuote(last);
  if (!quote.refundable || !last?.paymentKey) return quote;
  const full = quote.amount >= last.amount;
  await toss('POST', `/payments/${encodeURIComponent(last.paymentKey)}/cancel`, {
    cancelReason: '하루 한수 플러스 환불 요청',
    ...(full ? {} : { cancelAmount: quote.amount }),
  });
  await prisma.subscriptionPayment.update({
    where: { id: last.id },
    data: { status: full ? 'refunded' : 'partially_refunded', refundedAmount: quote.amount },
  });
  await expire(sub.id);
  await notify(sub.account.phone, `플러스 구독이 해지되고 ${won(quote.amount)}이 환불 처리됐어요. 카드사에 따라 며칠 걸릴 수 있어요.`);
  return quote;
}

// ─── 갱신 배치 ─────────────────────────────────────────

/** 첫 결제 도중 서버가 멈춰 구독이 켜지지 않은 건: 토스에 주문을 조회해 결제됐으면 구독을 켠다 */
async function recoverPendingOrders(now: Date) {
  const stuck = await prisma.subscription.findMany({
    where: { pendingOrderId: { not: null }, updatedAt: { lte: new Date(now.getTime() - PENDING_RECHECK_MS) } },
  });
  for (const sub of stuck) {
    const orderId = sub.pendingOrderId!;
    const found = await findPaidOrder(orderId);
    if (!found || !isPlanId(sub.plan)) {
      await prisma.subscription.update({ where: { id: sub.id }, data: { pendingOrderId: null } });
      continue;
    }
    const start = found.approvedAt ? new Date(found.approvedAt) : sub.updatedAt;
    const end = addMonths(start, PLANS[sub.plan].months);
    await prisma.subscriptionPayment.upsert({
      where: { orderId },
      create: {
        subscriptionId: sub.id,
        orderId,
        plan: sub.plan,
        amount: PLANS[sub.plan].amount,
        status: 'paid',
        paymentKey: found.paymentKey,
        periodStart: start,
        periodEnd: end,
        createdAt: start,
      },
      update: { status: 'paid', paymentKey: found.paymentKey },
    });
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'active', currentPeriodEnd: end, cancelAtPeriodEnd: false, failedAttempts: 0, pendingOrderId: null },
    });
    console.log('[billing] 멈췄던 첫 결제를 되살려 구독을 켰어요', sub.id);
  }
}

/** 연간 요금제 갱신 며칠 전 안내 문자 */
async function sendRenewalNotices(now: Date) {
  const soon = await prisma.subscription.findMany({
    where: {
      status: 'active',
      cancelAtPeriodEnd: false,
      currentPeriodEnd: { gt: now, lte: new Date(now.getTime() + YEARLY_NOTICE_DAYS * DAY_MS) },
    },
    include: { account: true },
  });
  for (const sub of soon) {
    const plan = isPlanId(sub.nextPlan) ? sub.nextPlan : sub.plan;
    if (plan !== 'yearly' || !sub.currentPeriodEnd) continue;
    if (sub.renewalNoticeFor?.getTime() === sub.currentPeriodEnd.getTime()) continue;
    await notify(
      sub.account.phone,
      `플러스 연간 구독이 ${kstDate(sub.currentPeriodEnd)}에 ${won(PLANS.yearly.amount)}으로 자동 갱신돼요. 원하지 않으시면 설정 > 하루 한수 플러스에서 해지할 수 있어요.`,
    );
    await prisma.subscription.update({ where: { id: sub.id }, data: { renewalNoticeFor: sub.currentPeriodEnd } });
  }
}

let running = false;

/** 기간이 끝난 구독을 갱신 결제하거나 만료시킨다. 서버 한 대에서 한 번에 하나만 돈다 */
export async function runRenewals(): Promise<void> {
  if (running || !billingEnabled()) return;
  running = true;
  try {
    const now = new Date();
    await recoverPendingOrders(now).catch((e) => console.error('[billing] 결제 복구 실패', e));
    await sendRenewalNotices(now).catch((e) => console.error('[billing] 갱신 안내 실패', e));

    const due = await prisma.subscription.findMany({
      where: { status: { in: ['active', 'past_due'] }, currentPeriodEnd: { lte: now } },
      include: { account: true },
    });
    for (const sub of due) {
      try {
        const plan = isPlanId(sub.nextPlan) ? sub.nextPlan : sub.plan;
        if (sub.cancelAtPeriodEnd || !sub.billingKey || !isPlanId(plan)) {
          await expire(sub.id);
          continue;
        }
        if (sub.lastAttemptAt && now.getTime() - sub.lastAttemptAt.getTime() < RETRY_GAP_MS) continue;

        const end = sub.currentPeriodEnd!;
        const periodStart = now.getTime() - end.getTime() > MAX_BACKDATE_MS ? now : end;
        const result = await chargePeriod({
          sub,
          plan,
          orderId: renewalOrderId(sub, periodStart, sub.failedAttempts),
          periodStart,
          customer: { email: sub.account.email, name: sub.account.displayName },
        });

        if (result.ok) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: 'active', plan, nextPlan: null, currentPeriodEnd: result.periodEnd, failedAttempts: 0, lastAttemptAt: now },
          });
        } else if (sub.failedAttempts + 1 >= MAX_RETRY) {
          await expire(sub.id);
          await notify(sub.account.phone, '갱신 결제에 계속 실패해서 플러스 이용이 끝났어요. 다시 이용하시려면 앱에서 새로 구독해 주세요.');
        } else {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: 'past_due', failedAttempts: { increment: 1 }, lastAttemptAt: now },
          });
          await notify(
            sub.account.phone,
            `플러스 갱신 결제(${won(PLANS[plan].amount)})에 실패했어요. 카드 상태를 확인해 주세요. 내일 다시 시도해요.`,
          );
        }
      } catch (e) {
        console.error('[billing] 갱신 처리 실패', sub.id, e);
      }
    }
  } finally {
    running = false;
  }
}

export function startRenewalScheduler() {
  if (!billingEnabled()) {
    console.log('[billing] TOSS 키가 없어 구독 기능이 꺼져 있어요.');
    return;
  }
  setTimeout(() => void runRenewals(), 30_000);
  setInterval(() => void runRenewals(), 60 * 60 * 1000);
}

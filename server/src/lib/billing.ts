import { randomUUID } from 'node:crypto';
import type { Subscription } from '@prisma/client';
import { prisma } from './prisma.js';

/**
 * 하루 한수 플러스(개인 구독) — 토스페이먼츠 자동결제(빌링).
 * TOSS_CLIENT_KEY / TOSS_SECRET_KEY가 없으면 구독 기능 전체가 꺼진다.
 * 흐름: 카드 등록(authKey) → 빌링키 발급 → 첫 기간 결제 → 매시간 만료된 구독을 갱신 결제.
 */
export const PLANS = {
  monthly: { amount: 1900, months: 1, name: '하루 한수 플러스 (월간)' },
  yearly: { amount: 19000, months: 12, name: '하루 한수 플러스 (연간)' },
} as const;
export type PlanId = keyof typeof PLANS;
export const isPlanId = (v: unknown): v is PlanId => v === 'monthly' || v === 'yearly';

/** 무료 계정이 한 가족 그룹에 등록할 수 있는 사람 수(본인 포함) */
export const FREE_PERSON_LIMIT = 2;

const MAX_RETRY = 3;
const RETRY_GAP_MS = 24 * 60 * 60 * 1000;
/** 서버가 오래 멈춰 있다가 켜졌을 때, 이미 지나간 기간을 소급 청구하지 않도록 */
const MAX_BACKDATE_MS = 3 * 24 * 60 * 60 * 1000;

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

export async function getOrCreateSubscription(accountId: string): Promise<Subscription> {
  const existing = await prisma.subscription.findUnique({ where: { accountId } });
  if (existing) return existing;
  return prisma.subscription.create({ data: { accountId, customerKey: `hh_${randomUUID()}` } });
}

export async function issueBillingKey(authKey: string, customerKey: string): Promise<string> {
  const r = await toss<{ billingKey: string }>('POST', '/billing/authorizations/issue', { authKey, customerKey });
  return r.billingKey;
}

interface ChargeInput {
  sub: Subscription;
  billingKey: string;
  plan: PlanId;
  orderId: string;
  periodStart: Date;
  customer: { email: string; name: string };
}

/**
 * 한 기간을 결제하고 기록한다. 결제 요청이 실패로 끝났더라도 이미 승인됐을 수 있으니(응답 유실 등)
 * 주문번호로 한 번 더 조회해서 확인한다.
 */
export async function chargePeriod({ sub, billingKey, plan, orderId, periodStart, customer }: ChargeInput) {
  const p = PLANS[plan];
  const periodEnd = addMonths(periodStart, p.months);
  let paymentKey: string | null = null;
  let failReason: string | null = null;
  try {
    const r = await toss<{ status: string; paymentKey: string }>('POST', `/billing/${billingKey}`, {
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
    try {
      const found = await toss<{ status: string; paymentKey: string }>('GET', `/payments/orders/${encodeURIComponent(orderId)}`);
      if (found.status === 'DONE') {
        paymentKey = found.paymentKey;
        failReason = null;
      }
    } catch {
      // 주문이 없으면 정말 실패한 것
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

async function expire(subId: string) {
  await prisma.subscription.update({
    where: { id: subId },
    data: { status: 'expired', billingKey: null, cancelAtPeriodEnd: false },
  });
}

let running = false;

/** 기간이 끝난 구독을 갱신 결제하거나 만료시킨다. 서버 한 대에서 한 번에 하나만 돈다 */
export async function runRenewals(): Promise<void> {
  if (running || !billingEnabled()) return;
  running = true;
  try {
    const now = new Date();
    const due = await prisma.subscription.findMany({
      where: { status: { in: ['active', 'past_due'] }, currentPeriodEnd: { lte: now } },
      include: { account: true },
    });
    for (const sub of due) {
      try {
        if (sub.cancelAtPeriodEnd || !sub.billingKey || !isPlanId(sub.plan)) {
          await expire(sub.id);
          continue;
        }
        if (sub.lastAttemptAt && now.getTime() - sub.lastAttemptAt.getTime() < RETRY_GAP_MS) continue;

        const end = sub.currentPeriodEnd!;
        const periodStart = now.getTime() - end.getTime() > MAX_BACKDATE_MS ? now : end;
        const result = await chargePeriod({
          sub,
          billingKey: sub.billingKey,
          plan: sub.plan,
          orderId: renewalOrderId(sub, periodStart, sub.failedAttempts),
          periodStart,
          customer: { email: sub.account.email, name: sub.account.displayName },
        });

        if (result.ok) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: 'active', currentPeriodEnd: result.periodEnd, failedAttempts: 0, lastAttemptAt: now },
          });
        } else if (sub.failedAttempts + 1 >= MAX_RETRY) {
          await expire(sub.id);
        } else {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: 'past_due', failedAttempts: { increment: 1 }, lastAttemptAt: now },
          });
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

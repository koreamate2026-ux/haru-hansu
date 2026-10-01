import { Router } from 'express';
import { z } from 'zod';
import {
  FREE_PERSON_LIMIT,
  PLANS,
  TossError,
  billingEnabled,
  chargePeriod,
  firstOrderId,
  getOrCreateSubscription,
  isPremium,
  issueBillingKey,
  lastPaidPayment,
  refund,
  refundQuote,
  sealBillingKey,
  tossClientKey,
} from '../lib/billing.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const billingRouter = Router();
billingRouter.use(requireAuth);

const planSchema = z.enum(['monthly', 'yearly']);

async function status(accountId: string) {
  const sub = await prisma.subscription.findUnique({ where: { accountId } });
  const premium = isPremium(sub);
  const last = sub ? await lastPaidPayment(sub.id) : null;
  return {
    enabled: billingEnabled(),
    premium,
    plan: sub?.plan ?? null,
    nextPlan: sub?.nextPlan ?? null,
    status: sub?.status ?? null,
    currentPeriodEnd: sub?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
    refund: premium ? refundQuote(last) : { refundable: false, amount: 0, reason: '' },
    freePersonLimit: FREE_PERSON_LIMIT,
    plans: {
      monthly: { amount: PLANS.monthly.amount, months: PLANS.monthly.months },
      yearly: { amount: PLANS.yearly.amount, months: PLANS.yearly.months },
    },
  };
}

billingRouter.get('/me', async (req, res) => {
  res.json(await status(req.accountId!));
});

/** 카드 등록창을 열기 전에 호출. 토스에 넘길 구매자 ID(customerKey)를 준다 */
billingRouter.post('/checkout', async (req, res) => {
  if (!billingEnabled()) return res.status(503).json({ error: '구독 결제를 준비 중이에요.' });
  const parsed = z.object({ plan: planSchema }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: '요금제를 골라 주세요.' });

  const sub = await getOrCreateSubscription(req.accountId!);
  if (isPremium(sub)) return res.status(409).json({ error: '이미 하루 한수 플러스를 이용 중이에요.' });

  const account = await prisma.account.findUniqueOrThrow({ where: { id: req.accountId! } });
  res.json({
    clientKey: tossClientKey(),
    customerKey: sub.customerKey,
    customerEmail: account.email.includes('@') ? account.email : undefined,
    customerName: account.displayName,
  });
});

/**
 * 카드 등록 성공 후 돌아와서 호출. 빌링키를 받고 첫 기간을 바로 결제한다.
 * 결제 요청 직전에 주문번호를 먼저 적어 두어서, 도중에 서버가 멈춰도 갱신 배치가 되짚어 구독을 켠다.
 */
billingRouter.post('/confirm', async (req, res) => {
  if (!billingEnabled()) return res.status(503).json({ error: '구독 결제를 준비 중이에요.' });
  const parsed = z.object({ authKey: z.string().min(1), customerKey: z.string().min(1), plan: planSchema }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: '결제 정보를 확인해 주세요.' });
  const { authKey, customerKey, plan } = parsed.data;

  const sub = await prisma.subscription.findUnique({ where: { accountId: req.accountId! }, include: { account: true } });
  if (!sub || sub.customerKey !== customerKey) return res.status(403).json({ error: '내 결제 정보가 아니에요.' });
  // 새로고침 등으로 한 번 더 들어와도 두 번 결제하지 않는다
  if (isPremium(sub)) return res.json(await status(req.accountId!));

  let billingKey: string;
  try {
    billingKey = await issueBillingKey(authKey, customerKey);
  } catch (e) {
    const again = await prisma.subscription.findUnique({ where: { id: sub.id } });
    if (isPremium(again)) return res.json(await status(req.accountId!));
    return res.status(400).json({ error: e instanceof TossError ? e.message : '카드 등록에 실패했어요.' });
  }

  const orderId = firstOrderId(sub);
  const ready = await prisma.subscription.update({
    where: { id: sub.id },
    data: { billingKey: sealBillingKey(billingKey), plan, nextPlan: null, pendingOrderId: orderId },
  });

  const periodStart = new Date();
  const result = await chargePeriod({
    sub: ready,
    plan,
    orderId,
    periodStart,
    customer: { email: sub.account.email, name: sub.account.displayName },
  });
  if (!result.ok) {
    await prisma.subscription.update({ where: { id: sub.id }, data: { pendingOrderId: null } });
    return res.status(402).json({ error: `결제에 실패했어요. ${result.failReason ?? ''}`.trim() });
  }

  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      status: 'active',
      currentPeriodEnd: result.periodEnd,
      cancelAtPeriodEnd: false,
      failedAttempts: 0,
      lastAttemptAt: periodStart,
      pendingOrderId: null,
    },
  });
  res.json(await status(req.accountId!));
});

/** 요금제 변경: 지금 기간은 그대로 쓰고, 다음 결제부터 바뀐다. 지금 요금제를 고르면 변경 예약 취소 */
billingRouter.post('/plan', async (req, res) => {
  const parsed = z.object({ plan: planSchema }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: '요금제를 골라 주세요.' });
  const sub = await prisma.subscription.findUnique({ where: { accountId: req.accountId! } });
  if (!sub || sub.status !== 'active' || !isPremium(sub)) return res.status(400).json({ error: '이용 중인 구독이 없어요.' });
  if (sub.cancelAtPeriodEnd) return res.status(400).json({ error: '해지를 예약한 상태에서는 요금제를 바꿀 수 없어요. 해지를 먼저 취소해 주세요.' });
  await prisma.subscription.update({
    where: { id: sub.id },
    data: { nextPlan: parsed.data.plan === sub.plan ? null : parsed.data.plan, renewalNoticeFor: null },
  });
  res.json(await status(req.accountId!));
});

/** 해지: 이미 낸 기간까지는 쓰고, 다음 결제부터 멈춘다. 결제 실패로 재시도 중이면 바로 끝낸다 */
billingRouter.post('/cancel', async (req, res) => {
  const sub = await prisma.subscription.findUnique({ where: { accountId: req.accountId! } });
  if (!sub || !isPremium(sub)) return res.status(400).json({ error: '이용 중인 구독이 없어요.' });
  if (sub.status === 'past_due') {
    await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'expired', billingKey: null, nextPlan: null } });
  } else {
    await prisma.subscription.update({ where: { id: sub.id }, data: { cancelAtPeriodEnd: true, nextPlan: null } });
  }
  res.json(await status(req.accountId!));
});

/** 해지 예약 취소 */
billingRouter.post('/resume', async (req, res) => {
  const sub = await prisma.subscription.findUnique({ where: { accountId: req.accountId! } });
  if (!sub || sub.status !== 'active' || !sub.cancelAtPeriodEnd || !isPremium(sub)) {
    return res.status(400).json({ error: '다시 이어서 쓸 수 있는 구독이 없어요.' });
  }
  await prisma.subscription.update({ where: { id: sub.id }, data: { cancelAtPeriodEnd: false } });
  res.json(await status(req.accountId!));
});

/** 환불 요청: 규정에 따라 계산한 금액을 돌려주고 구독을 바로 끝낸다 */
billingRouter.post('/refund', async (req, res) => {
  const sub = await prisma.subscription.findUnique({ where: { accountId: req.accountId! }, include: { account: true } });
  if (!sub || !isPremium(sub)) return res.status(400).json({ error: '이용 중인 구독이 없어요.' });
  try {
    const quote = await refund(sub);
    if (!quote.refundable) return res.status(400).json({ error: quote.reason });
    res.json({ ...(await status(req.accountId!)), refunded: quote.amount });
  } catch (e) {
    res.status(502).json({ error: e instanceof TossError ? `환불하지 못했어요. ${e.message}` : '환불하지 못했어요.' });
  }
});

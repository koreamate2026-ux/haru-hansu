import { Router } from 'express';
import { z } from 'zod';
import {
  PLANS,
  TossError,
  billingEnabled,
  chargePeriod,
  firstOrderId,
  getOrCreateSubscription,
  isPremium,
  issueBillingKey,
  tossClientKey,
} from '../lib/billing.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const billingRouter = Router();
billingRouter.use(requireAuth);

const planSchema = z.enum(['monthly', 'yearly']);

async function status(accountId: string) {
  const sub = await prisma.subscription.findUnique({ where: { accountId } });
  return {
    enabled: billingEnabled(),
    premium: isPremium(sub),
    plan: sub?.plan ?? null,
    status: sub?.status ?? null,
    currentPeriodEnd: sub?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
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
    customerEmail: account.email,
    customerName: account.displayName,
  });
});

/** 카드 등록 성공 후 돌아와서 호출. 빌링키를 받고 첫 기간을 바로 결제한다 */
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

  const periodStart = new Date();
  const result = await chargePeriod({
    sub,
    billingKey,
    plan,
    orderId: firstOrderId(sub),
    periodStart,
    customer: { email: sub.account.email, name: sub.account.displayName },
  });
  if (!result.ok) {
    return res.status(402).json({ error: `결제에 실패했어요. ${result.failReason ?? ''}`.trim() });
  }

  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      plan,
      billingKey,
      status: 'active',
      currentPeriodEnd: result.periodEnd,
      cancelAtPeriodEnd: false,
      failedAttempts: 0,
      lastAttemptAt: periodStart,
    },
  });
  res.json(await status(req.accountId!));
});

/** 해지: 이미 낸 기간까지는 쓰고, 다음 결제부터 멈춘다. 결제 실패로 재시도 중이면 바로 끝낸다 */
billingRouter.post('/cancel', async (req, res) => {
  const sub = await prisma.subscription.findUnique({ where: { accountId: req.accountId! } });
  if (!sub || !isPremium(sub)) return res.status(400).json({ error: '이용 중인 구독이 없어요.' });
  if (sub.status === 'past_due') {
    await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'expired', billingKey: null } });
  } else {
    await prisma.subscription.update({ where: { id: sub.id }, data: { cancelAtPeriodEnd: true } });
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

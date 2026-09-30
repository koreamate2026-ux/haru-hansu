import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Body, Button, Header, Screen, Section } from '../components/ui';
import { ApiError, api, type PlanId } from '../lib/api';
import { useAuth } from '../state/AuthState';
import { FREE_PERSON_LIMIT, useBilling } from '../state/BillingState';
import { BusinessInfo } from './Legal';

const TOSS_SDK = 'https://js.tosspayments.com/v2/standard';

type TossFactory = (clientKey: string) => {
  payment: (o: { customerKey: string }) => {
    requestBillingAuth: (o: {
      method: 'CARD';
      successUrl: string;
      failUrl: string;
      customerEmail?: string;
      customerName?: string;
    }) => Promise<void>;
  };
};

declare global {
  interface Window {
    TossPayments?: TossFactory;
  }
}

function loadToss(): Promise<TossFactory> {
  if (window.TossPayments) return Promise.resolve(window.TossPayments);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = TOSS_SDK;
    s.onload = () => (window.TossPayments ? resolve(window.TossPayments) : reject(new Error('결제창을 불러오지 못했어요.')));
    s.onerror = () => reject(new Error('결제창을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.'));
    document.head.appendChild(s);
  });
}

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;
const dateLabel = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
};

const BENEFITS = [
  '광고 없이 보기',
  `내가 만든 가족 그룹에 인원 제한 없이 등록 (무료는 ${FREE_PERSON_LIMIT}명까지)`,
  '자세한 사주 풀이 (10년 운의 흐름·올해·이번 달·타고난 성향)',
  '지난 회차 번호 기록 분석',
  '좋아하는 연예인·위인과 궁합 숫자',
];
const PLAN_LABEL: Record<PlanId, string> = { monthly: '월간', yearly: '연간' };

export default function Premium() {
  const navigate = useNavigate();
  const { account, token } = useAuth();
  const { loaded, premium, status, setStatus } = useBilling();
  const [plan, setPlan] = useState<PlanId>('monthly');
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const handled = useRef(false);

  // 토스 카드 등록창에서 돌아왔을 때(?billing=success|fail) 한 번만 처리한다
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const kind = q.get('billing');
    if (!kind || !token || handled.current) return;
    handled.current = true;
    const clean = () => window.history.replaceState(null, '', `${window.location.pathname}#/premium`);

    if (kind !== 'success') {
      setMsg({ ok: false, text: q.get('message') || '카드 등록이 취소됐어요.' });
      clean();
      return;
    }
    const authKey = q.get('authKey');
    const customerKey = q.get('customerKey');
    const p = q.get('plan');
    if (!authKey || !customerKey || (p !== 'monthly' && p !== 'yearly')) {
      clean();
      return;
    }
    setBusy(true);
    api
      .billingConfirm({ authKey, customerKey, plan: p }, token)
      .then((s) => {
        setStatus(s);
        setMsg({ ok: true, text: '하루 한수 플러스가 시작됐어요.' });
      })
      .catch((e) => setMsg({ ok: false, text: e instanceof ApiError ? e.message : '결제를 마치지 못했어요.' }))
      .finally(() => {
        setBusy(false);
        clean();
      });
  }, [token, setStatus]);

  if (!account || !token) return <Navigate to="/login" replace />;

  const plans = status?.plans ?? { monthly: { amount: 1900, months: 1 }, yearly: { amount: 19000, months: 12 } };
  const enabled = Boolean(status?.enabled);

  const subscribe = async () => {
    if (!agree || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const co = await api.billingCheckout(plan, token);
      const TossPayments = await loadToss();
      const base = `${window.location.origin}${window.location.pathname}`;
      await TossPayments(co.clientKey)
        .payment({ customerKey: co.customerKey })
        .requestBillingAuth({
          method: 'CARD',
          successUrl: `${base}?billing=success&plan=${plan}&`,
          failUrl: `${base}?billing=fail&`,
          customerEmail: co.customerEmail,
          customerName: co.customerName,
        });
    } catch (e) {
      const code = (e as { code?: string }).code;
      setMsg({ ok: false, text: code === 'USER_CANCEL' ? '카드 등록을 취소했어요.' : e instanceof Error ? e.message : '결제창을 열지 못했어요.' });
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!window.confirm('구독을 해지할까요?\n이미 결제한 기간까지는 계속 이용할 수 있어요.')) return;
    setBusy(true);
    try {
      setStatus(await api.billingCancel(token));
      setMsg({ ok: true, text: '해지를 예약했어요.' });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiError ? e.message : '해지하지 못했어요.' });
    } finally {
      setBusy(false);
    }
  };

  const changePlan = async (next: PlanId) => {
    if (!status?.plan) return;
    const undo = next === status.plan;
    if (!undo && !window.confirm(`다음 결제일부터 ${PLAN_LABEL[next]} 요금제(${won(plans[next].amount)})로 바꿀까요?\n지금 이용 기간은 그대로예요.`)) return;
    setBusy(true);
    try {
      setStatus(await api.billingChangePlan(next, token));
      setMsg({ ok: true, text: undo ? '요금제를 그대로 유지해요.' : `다음 결제부터 ${PLAN_LABEL[next]} 요금제로 바뀌어요.` });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiError ? e.message : '요금제를 바꾸지 못했어요.' });
    } finally {
      setBusy(false);
    }
  };

  const requestRefund = async () => {
    const r = status?.refund;
    if (!r?.refundable) return;
    if (!window.confirm(`${won(r.amount)}을 환불할까요?\n${r.reason}\n환불하면 플러스 혜택이 바로 끝나요.`)) return;
    setBusy(true);
    try {
      const res = await api.billingRefund(token);
      setStatus(res);
      setMsg({ ok: true, text: `${won(res.refunded)} 환불을 요청했어요. 카드사에 따라 3~7영업일 걸릴 수 있어요.` });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiError ? e.message : '환불하지 못했어요.' });
    } finally {
      setBusy(false);
    }
  };

  const resume = async () => {
    setBusy(true);
    try {
      setStatus(await api.billingResume(token));
      setMsg({ ok: true, text: '구독을 계속 이어가요.' });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiError ? e.message : '처리하지 못했어요.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Header title="하루 한수 플러스" fallback="/settings" />
      <Screen>
        {msg ? (
          <Body small style={{ color: msg.ok ? 'var(--gold)' : 'var(--danger)', marginBottom: 16 }}>
            {msg.text}
          </Body>
        ) : null}

        {!loaded || (busy && !premium) ? (
          <Body dim>잠시만 기다려 주세요…</Body>
        ) : premium && status ? (
          <Section title="이용 중이에요">
            <Body>
              {status.plan === 'yearly' ? '연간' : '월간'} 요금제 · {won(plans[status.plan ?? 'monthly'].amount)}
            </Body>
            <Body dim small style={{ margin: '6px 0 16px' }}>
              {status.status === 'past_due'
                ? '갱신 결제에 실패해서 하루에 한 번 다시 시도하고 있어요. 카드 상태를 확인해 주세요.'
                : status.cancelAtPeriodEnd
                  ? `${dateLabel(status.currentPeriodEnd)}까지 이용하고 해지돼요.`
                  : `다음 결제일은 ${dateLabel(status.currentPeriodEnd)}이에요.`}
            </Body>
            {status.nextPlan && status.status === 'active' && !status.cancelAtPeriodEnd ? (
              <Body small style={{ marginBottom: 12 }}>
                다음 결제일부터 {PLAN_LABEL[status.nextPlan]} 요금제({won(plans[status.nextPlan].amount)})로 바뀌어요.
              </Body>
            ) : null}
            <div className="stack">
              {status.status === 'active' && !status.cancelAtPeriodEnd && status.plan ? (
                status.nextPlan ? (
                  <Button label="요금제 바꾸지 않기" kind="secondary" onPress={() => changePlan(status.plan!)} disabled={busy} />
                ) : (
                  <Button
                    label={`${PLAN_LABEL[status.plan === 'monthly' ? 'yearly' : 'monthly']} 요금제로 바꾸기`}
                    kind="secondary"
                    onPress={() => changePlan(status.plan === 'monthly' ? 'yearly' : 'monthly')}
                    disabled={busy}
                  />
                )
              ) : null}
              {status.cancelAtPeriodEnd ? (
                <Button label="해지 취소하고 계속 이용하기" onPress={resume} disabled={busy} />
              ) : (
                <Button label="구독 해지" kind="secondary" onPress={cancel} disabled={busy} />
              )}
              {status.refund.refundable ? (
                <Button label={`환불 요청 (${won(status.refund.amount)})`} kind="danger" onPress={requestRefund} disabled={busy} />
              ) : null}
            </div>
            <Body dim small style={{ marginTop: 12 }}>
              {status.refund.reason}{' '}
              <button type="button" className="link" style={{ margin: 0, fontSize: 13 }} onClick={() => navigate('/legal/refund')}>
                환불 정책 보기
              </button>
            </Body>
          </Section>
        ) : (
          <>
            <h2 className="title" style={{ fontSize: 24, lineHeight: '34px' }}>
              광고 없이, 가족 모두 함께
            </h2>
            <Body dim style={{ margin: '8px 0 20px' }}>
              하루 한수 플러스로 더 편하게 써 보세요.
            </Body>

            <ul className="benefits">
              {BENEFITS.map((b) => (
                <li key={b}>
                  <span aria-hidden>✓</span>
                  {b}
                </li>
              ))}
            </ul>

            <div className="plans" role="radiogroup" aria-label="요금제">
              <button type="button" role="radio" aria-checked={plan === 'monthly'} className={plan === 'monthly' ? 'plan on' : 'plan'} onClick={() => setPlan('monthly')}>
                <span className="plan-name">월간</span>
                <span className="plan-price">{won(plans.monthly.amount)}</span>
                <span className="plan-note">매달 결제</span>
              </button>
              <button type="button" role="radio" aria-checked={plan === 'yearly'} className={plan === 'yearly' ? 'plan on' : 'plan'} onClick={() => setPlan('yearly')}>
                <span className="plan-name">연간</span>
                <span className="plan-price">{won(plans.yearly.amount)}</span>
                <span className="plan-note">2개월 무료 · 월 {won(Math.round(plans.yearly.amount / 12))}꼴</span>
              </button>
            </div>

            <label className="agree">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              <span>
                오늘 {won(plans[plan].amount)}이 결제되고, 해지하기 전까지 {plan === 'yearly' ? '매년' : '매달'} 같은 날 자동으로 결제되는 것에 동의해요.
              </span>
            </label>

            <Button
              label={!enabled ? '결제 준비 중이에요' : busy ? '결제창 여는 중…' : `${won(plans[plan].amount)} 결제하고 시작하기`}
              onPress={subscribe}
              disabled={!enabled || !agree || busy}
            />
            <p className="notice" style={{ marginTop: 12 }}>
              언제든 설정에서 해지할 수 있고, 해지해도 이미 결제한 기간까지는 계속 이용할 수 있어요. 결제 후 7일 안에는 전액 환불돼요.{' '}
              <button type="button" className="link" style={{ margin: 0, fontSize: 12 }} onClick={() => navigate('/legal/terms')}>
                이용약관
              </button>{' '}
              ·{' '}
              <button type="button" className="link" style={{ margin: 0, fontSize: 12 }} onClick={() => navigate('/legal/refund')}>
                환불 정책
              </button>
            </p>
          </>
        )}
        <BusinessInfo />
      </Screen>
    </>
  );
}

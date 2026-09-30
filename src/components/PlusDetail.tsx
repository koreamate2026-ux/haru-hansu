import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { LuckyCategory } from '../lib/luckyNumbers';
import { MAX_DAILY_PICKS, useDailyPicks } from '../lib/todayNumbers';
import { useAuth } from '../state/AuthState';
import { useBilling } from '../state/BillingState';
import { LottoBall } from './LottoBall';
import { Body, Button, useToast } from './ui';

/** 플러스 상세 화면: 로그인·구독 확인. 구독 여부를 받아오는 동안은 아무것도 그리지 않는다 */
export function PlusOnly({ children }: { children: ReactNode }) {
  const { account } = useAuth();
  const { loaded, premium } = useBilling();
  if (!account) return <Navigate to="/login" replace />;
  if (!loaded) return null;
  if (!premium) return <Navigate to="/premium" replace />;
  return <>{children}</>;
}

/** 상세 화면 맨 위의 오늘의 숫자 카드 + 담기·복사 */
export function TodayNumberCard({ category }: { category: LuckyCategory }) {
  const toast = useToast();
  const { picks, add } = useDailyPicks();
  const n = category.nums[0];
  const taken = n !== undefined && picks.includes(n);
  const full = picks.length >= MAX_DAILY_PICKS;

  const copy = () => {
    const text = `${category.title}: ${category.nums.join(', ')}`;
    navigator.clipboard?.writeText(text).then(
      () => toast.show('번호를 복사했어요'),
      () => toast.show(text),
    );
  };

  return (
    <div className="card plus-today">
      <span className="dim small">오늘의 숫자</span>
      {n !== undefined ? (
        <div className="sheet-number" style={{ padding: '12px 0' }}>
          <LottoBall n={n} size={72} />
        </div>
      ) : null}
      <Body small>{category.story}</Body>
      {n !== undefined ? (
        <div className="stack" style={{ marginTop: 14, width: '100%' }}>
          <Button
            label={taken ? '이미 담았어요' : full ? '오늘의 숫자가 이미 다 찼어요' : '오늘의 숫자에 담기'}
            onPress={() => {
              add(n);
              toast.show('오늘의 숫자에 담았어요');
            }}
            disabled={taken || full}
          />
          <Button label="번호 복사" kind="secondary" onPress={copy} />
        </div>
      ) : null}
      {toast.node}
    </div>
  );
}

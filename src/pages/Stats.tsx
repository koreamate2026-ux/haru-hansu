import { useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { BallRow } from '../components/LottoBall';
import { Body, Button, Header, Screen, Section } from '../components/ui';
import { checkTicket } from '../lib/lotto';
import { isDrawn } from '../lib/rounds';
import type { SavedTicket } from '../lib/types';
import { useApp } from '../state/AppState';
import { useAuth } from '../state/AuthState';
import { useBilling } from '../state/BillingState';

const RANK_LABEL = { 1: '1등', 2: '2등', 3: '3등', 4: '4등', 5: '5등' } as const;

function methodOf(t: SavedTicket): string {
  if (t.category === 'today-pick') return '오늘의 숫자 모음';
  if (t.source === 'manual' || t.category === 'manual') return '직접 저장';
  return '카테고리 숫자';
}

/** 하루 한수 플러스: 번호함 기록 모아 보기. 지난 기록일 뿐 앞으로의 확률과는 관계없다 */
export default function Stats() {
  const navigate = useNavigate();
  const { tickets, draws } = useApp();
  const { loaded, premium } = useBilling();
  const { account } = useAuth();

  const stats = useMemo(() => {
    const checked = tickets
      .filter((t) => draws[t.round])
      .map((t) => ({ t, r: checkTicket(t.numbers, draws[t.round]) }));
    const missingRounds = new Set(tickets.filter((t) => isDrawn(t.round) && !draws[t.round]).map((t) => t.round)).size;

    const byMatched = Array.from({ length: 7 }, (_, n) => checked.filter((x) => x.r.matched.length === n).length);
    const wins = checked.filter((x) => x.r.rank);
    const bestRank = wins.reduce<number | null>((b, x) => (b === null || x.r.rank! < b ? x.r.rank! : b), null);
    const bestMatched = checked.reduce((b, x) => Math.max(b, x.r.matched.length), 0);

    const methods = new Map<string, { count: number; matched: number }>();
    for (const { t, r } of checked) {
      const m = methods.get(methodOf(t)) ?? { count: 0, matched: 0 };
      methods.set(methodOf(t), { count: m.count + 1, matched: m.matched + r.matched.length });
    }

    const freq = new Map<number, number>();
    for (const t of tickets) for (const n of t.numbers) freq.set(n, (freq.get(n) ?? 0) + 1);
    const topNumbers = [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, 6);

    const rounds = [...new Set(checked.map((x) => x.t.round))].sort((a, b) => b - a).slice(0, 8);
    const recent = rounds.map((round) => ({
      round,
      best: Math.max(...checked.filter((x) => x.t.round === round).map((x) => x.r.matched.length)),
      count: checked.filter((x) => x.t.round === round).length,
    }));

    return {
      total: tickets.length,
      roundCount: new Set(tickets.map((t) => t.round)).size,
      checked: checked.length,
      missingRounds,
      byMatched,
      wins: wins.length,
      bestRank,
      bestMatched,
      methods: [...methods.entries()],
      topNumbers,
      recent,
    };
  }, [tickets, draws]);

  if (!account) return <Navigate to="/login" replace />;
  if (loaded && !premium) {
    return (
      <>
        <Header title="번호 기록 분석" fallback="/tickets" />
        <Screen>
          <h2 className="title" style={{ fontSize: 24, lineHeight: '34px' }}>
            하루 한수 플러스 기능이에요
          </h2>
          <p className="sub" style={{ margin: '8px 0 24px' }}>
            그동안 저장한 번호가 회차마다 몇 개 맞았는지, 어떤 방법으로 고른 번호가 많이 맞았는지, 자주 담은 번호는 무엇인지 한눈에 볼 수 있어요.
          </p>
          <Button label="플러스 알아보기" onPress={() => navigate('/premium')} />
        </Screen>
      </>
    );
  }

  const max = Math.max(1, ...stats.byMatched);

  return (
    <>
      <Header title="번호 기록 분석" fallback="/tickets" />
      <Screen>
        <Body dim small style={{ marginBottom: 20 }}>
          저장한 번호 {stats.total}개 · {stats.roundCount}회차 중 결과가 나온 번호 {stats.checked}개를 모았어요.
          {stats.missingRounds ? ` 결과를 아직 불러오지 않은 회차 ${stats.missingRounds}개는 번호함에서 불러오면 함께 계산돼요.` : ''}
        </Body>

        {stats.checked === 0 ? (
          <Body dim>아직 결과가 나온 번호가 없어요. 추첨이 끝나면 여기에서 모아 볼 수 있어요.</Body>
        ) : (
          <>
            <Section title="가장 좋았던 기록">
              <Body>
                {stats.bestRank ? `${RANK_LABEL[stats.bestRank as keyof typeof RANK_LABEL]} 당첨` : `최대 ${stats.bestMatched}개 맞음`}
                {stats.wins ? ` · 당첨 ${stats.wins}번` : ''}
              </Body>
            </Section>

            <Section title="맞은 개수">
              <div className="bars">
                {stats.byMatched.map((count, n) => (
                  <div key={n} className="bar-row">
                    <span className="bar-label">{n}개</span>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${(count / max) * 100}%`, background: 'var(--gold)', borderWidth: 0 }} />
                    </div>
                    <span className="bar-value">{count}</span>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="고른 방법별">
              <dl className="kv" style={{ margin: 0 }}>
                {stats.methods.map(([name, m]) => (
                  <div key={name}>
                    <dt>{name}</dt>
                    <dd>
                      {m.count}개 · 평균 {(m.matched / m.count).toFixed(1)}개 맞음
                    </dd>
                  </div>
                ))}
              </dl>
            </Section>

            <Section title="최근 회차">
              <dl className="kv" style={{ margin: 0 }}>
                {stats.recent.map((r) => (
                  <div key={r.round}>
                    <dt>제{r.round}회</dt>
                    <dd>
                      {r.count}개 저장 · 가장 많이 맞은 번호 {r.best}개
                    </dd>
                  </div>
                ))}
              </dl>
            </Section>
          </>
        )}

        {stats.topNumbers.length ? (
          <Section title="자주 담은 번호">
            <BallRow numbers={stats.topNumbers.map(([n]) => n)} size={36} />
            <Body dim small style={{ marginTop: 8 }}>
              {stats.topNumbers.map(([n, c]) => `${n}번 ${c}회`).join(' · ')}
            </Body>
          </Section>
        ) : null}

        <p className="notice">지난 기록을 모아 본 것일 뿐, 앞으로의 당첨 확률과는 관계없어요.</p>
      </Screen>
    </>
  );
}

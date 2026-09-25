import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BallRow } from '../components/LottoBall';
import { Body, Button, Screen, Title } from '../components/ui';
import { checkTicket } from '../lib/lotto';
import { drawDate, isDrawn } from '../lib/rounds';
import type { SavedTicket } from '../lib/types';
import { useApp } from '../state/AppState';

const RANK_LABEL = { 1: '1등', 2: '2등', 3: '3등', 4: '4등', 5: '5등' } as const;

export default function Tickets() {
  const navigate = useNavigate();
  const { tickets, draws, loadDraw, removeTicket } = useApp();
  const [loading, setLoading] = useState<Record<number, boolean>>({});
  const [failed, setFailed] = useState<Record<number, boolean>>({});

  const groups = useMemo(() => {
    const map = new Map<number, SavedTicket[]>();
    for (const t of tickets) map.set(t.round, [...(map.get(t.round) ?? []), t]);
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [tickets]);

  const fetchRound = async (round: number) => {
    setLoading((s) => ({ ...s, [round]: true }));
    const d = await loadDraw(round);
    setLoading((s) => ({ ...s, [round]: false }));
    setFailed((s) => ({ ...s, [round]: !d }));
  };

  // 추첨이 끝났는데 결과가 없는 최근 회차는 자동으로 불러오기
  useEffect(() => {
    const pending = groups.map(([r]) => r).filter((r) => isDrawn(r) && !draws[r] && failed[r] === undefined && !loading[r]);
    pending.slice(0, 3).forEach(fetchRound);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, draws]);

  const confirmRemove = (t: SavedTicket) => {
    if (window.confirm(`이 번호를 지울까요?\n${t.numbers.join(', ')}`)) removeTicket(t.id);
  };

  return (
    <Screen tabs>
      <Title sub="저장한 번호와 추첨 결과를 회차별로 모아 봐요.">번호함</Title>
      <div style={{ marginBottom: 32 }}>
        <Button label="산 번호 직접 저장" kind="secondary" onPress={() => navigate('/ticket-new')} />
      </div>

      {groups.length === 0 ? <Body dim>아직 저장한 번호가 없어요. 이번 주 탭에서 마음에 드는 조합을 저장해 보세요.</Body> : null}

      {groups.map(([round, list]) => {
        const draw = draws[round];
        const drawn = isDrawn(round);
        return (
          <section key={round} className="group">
            <div className="group-head">
              <h2 className="group-round" style={{ margin: 0 }}>
                제{round}회
              </h2>
              <span className="faint small">{drawDate(round).label}</span>
            </div>

            {!drawn ? <span className="status">추첨 전이에요. 토요일 저녁에 결과를 확인할 수 있어요.</span> : null}
            {drawn && draw ? (
              <div className="stack" style={{ gap: 8, paddingBottom: 8 }}>
                <span className="status">당첨번호{draw.source === 'manual' ? ' (직접 입력)' : ''}</span>
                <BallRow numbers={draw.numbers} bonus={draw.bonus} size={32} />
              </div>
            ) : null}
            {drawn && !draw ? (
              <div className="fetch-row">
                {loading[round] ? (
                  <span className="spinner" aria-label="불러오는 중" />
                ) : (
                  <>
                    <span className="status" style={{ flex: 1 }}>
                      {failed[round] ? '결과를 불러오지 못했어요.' : '결과를 아직 불러오지 않았어요.'}
                    </span>
                    <button type="button" className="text-btn" onClick={() => fetchRound(round)}>
                      다시 시도
                    </button>
                    <button type="button" className="text-btn" onClick={() => navigate(`/draw-entry/${round}`)}>
                      직접 입력
                    </button>
                  </>
                )}
              </div>
            ) : null}

            {list.map((t) => {
              const result = draw ? checkTicket(t.numbers, draw) : null;
              return (
                <div key={t.id} className="ticket">
                  <div className="ticket-head">
                    <span className="dim small" style={{ flex: 1 }}>
                      {t.profileName} · {t.source === 'saju' ? '추천 번호' : '직접 저장'}
                    </span>
                    {result ? (
                      <span className={result.rank ? 'rank win' : 'rank'}>
                        {result.rank ? RANK_LABEL[result.rank] : `${result.matched.length}개 맞음`}
                      </span>
                    ) : null}
                    <button type="button" className="ticket-del" onClick={() => confirmRemove(t)} aria-label="이 번호 지우기">
                      지우기
                    </button>
                  </div>
                  <BallRow numbers={t.numbers} size={34} highlight={result ? result.matched : undefined} />
                </div>
              );
            })}
          </section>
        );
      })}
    </Screen>
  );
}

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BallRow } from '../components/LottoBall';
import { Body, Button, Screen, Title } from '../components/ui';
import { drawDate, upcomingRound } from '../lib/rounds';
import type { SavedTicket } from '../lib/types';
import { useApp } from '../state/AppState';

/** 그 주(일~토)의 날짜 범위. 저장 묶음은 토요일로 끝나는 한 주 단위다 */
function weekLabel(round: number) {
  const sat = drawDate(round);
  const end = new Date(sat.y, sat.m - 1, sat.d);
  const start = new Date(end);
  start.setDate(end.getDate() - 6);
  return `${start.getMonth() + 1}월 ${start.getDate()}일 ~ ${end.getMonth() + 1}월 ${end.getDate()}일`;
}

/** 번호함: 저장한 숫자를 주별로 모아 본다 */
export default function Tickets() {
  const navigate = useNavigate();
  const { tickets, removeTicket } = useApp();
  const thisWeek = upcomingRound();

  const groups = useMemo(() => {
    const map = new Map<number, SavedTicket[]>();
    for (const t of tickets) map.set(t.round, [...(map.get(t.round) ?? []), t]);
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [tickets]);

  const confirmRemove = (t: SavedTicket) => {
    if (window.confirm(`이 숫자를 지울까요?\n${t.numbers.join(', ')}`)) removeTicket(t.id);
  };

  return (
    <Screen tabs>
      <Title sub="저장한 숫자를 주별로 모아 봐요.">번호함</Title>
      <div style={{ marginBottom: 32 }}>
        <Button label="숫자 직접 저장" kind="secondary" onPress={() => navigate('/ticket-new')} />
      </div>

      {groups.length === 0 ? <Body dim>아직 저장한 숫자가 없어요. 홈에서 마음에 드는 숫자를 모아 저장해 보세요.</Body> : null}

      {groups.map(([round, list]) => (
        <section key={round} className="group">
          <div className="group-head">
            <h2 className="group-round" style={{ margin: 0 }}>
              {round === thisWeek ? '이번 주' : round === thisWeek - 1 ? '지난주' : weekLabel(round)}
            </h2>
            {round >= thisWeek - 1 ? <span className="faint small">{weekLabel(round)}</span> : null}
          </div>

          {list.map((t) => (
            <div key={t.id} className="ticket">
              <div className="ticket-head">
                <span className="dim small" style={{ flex: 1 }}>
                  {t.profileName} · {t.source === 'saju' ? '추천 숫자' : '직접 저장'}
                </span>
                <button type="button" className="ticket-del" onClick={() => confirmRemove(t)} aria-label="이 숫자 지우기">
                  지우기
                </button>
              </div>
              <BallRow numbers={t.numbers} size={34} />
            </div>
          ))}
        </section>
      ))}
    </Screen>
  );
}

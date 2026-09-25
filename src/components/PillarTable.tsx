import { ELEMENT_INFO } from '../lib/elements';
import type { Pillar, SajuChart } from '../lib/saju';

function Cell({ hanja, ko, element, strong }: { hanja: string; ko: string; element: Pillar['stemElement']; strong?: boolean }) {
  const info = ELEMENT_INFO[element];
  const cls = ['pillar-cell', element === 'water' && 'water', strong && 'strong'].filter(Boolean).join(' ');
  return (
    <div className={cls} style={{ backgroundColor: info.color, color: info.ink }}>
      <span className="pillar-hanja">{hanja}</span>
      <span className="pillar-ko">
        {ko} · {info.name}
      </span>
    </div>
  );
}

/** 사주 여덟 글자 표. 전통 표기처럼 오른쪽부터 해·달·날·시 */
export function PillarTable({ chart }: { chart: SajuChart }) {
  const cols = [chart.pillars.time, chart.pillars.day, chart.pillars.month, chart.pillars.year];
  const labels = ['태어난 시', '태어난 날', '태어난 달', '태어난 해'];
  return (
    <div className="pillars">
      {cols.map((p, i) => (
        <div key={labels[i]} className="pillar-col">
          <span className="pillar-label">{labels[i]}</span>
          {p ? (
            <>
              <Cell hanja={p.stem} ko={p.stemKo} element={p.stemElement} strong={i === 1} />
              <Cell hanja={p.branch} ko={p.branchKo} element={p.branchElement} />
            </>
          ) : (
            <div className="pillar-unknown">
              시간
              <br />
              모름
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

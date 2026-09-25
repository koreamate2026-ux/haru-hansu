import { ELEMENTS, ELEMENT_INFO } from '../lib/elements';
import type { Element } from '../lib/types';

/** 오행 분포 막대. values는 개수(사주) 또는 가중치(번호 추천) */
export function ElementBars({ values, mark, unit = '' }: { values: Record<Element, number>; mark?: Element; unit?: string }) {
  const max = Math.max(...ELEMENTS.map((e) => values[e]), 1);
  return (
    <div className="bars">
      {ELEMENTS.map((e) => {
        const info = ELEMENT_INFO[e];
        const v = values[e];
        return (
          <div key={e} className="bar-row" aria-label={`${info.name} ${v}${unit}`}>
            <span className="bar-label" style={mark === e ? { color: 'var(--gold)' } : undefined}>
              <span className="bar-hanja">{info.hanja}</span>
              {info.name}
            </span>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{
                  width: `${(v / max) * 100}%`,
                  backgroundColor: info.color,
                  borderWidth: e === 'water' && v > 0 ? 1 : 0,
                  minWidth: v > 0 ? 4 : 0,
                }}
              />
            </div>
            <span className="bar-value">
              {Number.isInteger(v) ? v : v.toFixed(1)}
              {unit}
            </span>
          </div>
        );
      })}
    </div>
  );
}

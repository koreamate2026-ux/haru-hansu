import { ELEMENT_INFO, numberElement } from '../lib/elements';

/** 번호공: 번호의 오행(끝자리) 색으로 칠한다 */
export function LottoBall({ n, size = 44, dim = false, ring = false }: { n: number; size?: number; dim?: boolean; ring?: boolean }) {
  const info = ELEMENT_INFO[numberElement(n)];
  const isWater = info.color === '#0E1224';
  return (
    <span
      className="ball"
      role="img"
      aria-label={`${n}번, ${info.name}`}
      style={{
        width: size,
        height: size,
        backgroundColor: info.color,
        color: info.ink,
        fontSize: size * 0.4,
        opacity: dim ? 0.3 : 1,
        boxShadow: ring ? 'inset 0 0 0 3px var(--gold)' : isWater ? 'inset 0 0 0 1px var(--water-ring)' : undefined,
      }}
    >
      {n}
    </span>
  );
}

export function BallRow({ numbers, size, highlight, bonus }: { numbers: number[]; size?: number; highlight?: number[]; bonus?: number }) {
  return (
    <div className="ball-row">
      {numbers.map((n) => (
        <LottoBall key={n} n={n} size={size} dim={highlight ? !highlight.includes(n) : false} ring={highlight?.includes(n)} />
      ))}
      {bonus !== undefined ? (
        <>
          <span className="ball-plus">+</span>
          <LottoBall n={bonus} size={size} />
        </>
      ) : null}
    </div>
  );
}

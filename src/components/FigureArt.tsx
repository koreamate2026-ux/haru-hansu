import type { ReactNode } from 'react';

/**
 * 위인 상징 그림(직접 그린 SVG). 얼굴을 닮게 그리지 않고, 그 사람을 떠올리게 하는 물건을
 * 로고와 같은 먹선으로 그렸다. 선은 currentColor라 글자색을 따라가고, 강조색만 따로 칠한다.
 */
const GOLD = 'var(--gold)';
const SOFT = 'var(--surface-high)';

function star(cx: number, cy: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = ((-90 + i * 36) * Math.PI) / 180;
    const rr = i % 2 === 0 ? r : r * 0.45;
    pts.push(`${(cx + rr * Math.cos(rad)).toFixed(1)},${(cy + rr * Math.sin(rad)).toFixed(1)}`);
  }
  return pts.join(' ');
}

const ART: Record<string, ReactNode> = {
  // 세종대왕: 한글 책
  sejong: (
    <>
      <path d="M10 20 Q21 15 32 20 Q43 15 54 20 V46 Q43 41 32 46 Q21 41 10 46 Z" fill={SOFT} />
      <line x1="32" y1="20" x2="32" y2="46" />
      <text x="21" y="37" fontSize="12" textAnchor="middle" fill="currentColor" stroke="none" fontFamily="var(--font-display)" fontWeight="700">
        가
      </text>
      <text x="43" y="37" fontSize="12" textAnchor="middle" fill="currentColor" stroke="none" fontFamily="var(--font-display)" fontWeight="700">
        나
      </text>
    </>
  ),
  // 이순신: 거북선
  yisunsin: (
    <>
      <path d="M8 38 H56 L50 46 H14 Z" fill={SOFT} />
      <path d="M15 38 Q32 20 49 38" />
      <path d="M21 31 l-1 -3 M26.5 27.5 v-3 M32 26 v-3 M37.5 27.5 v-3 M43 31 l1 -3" />
      <circle cx="10" cy="32" r="3.5" fill={GOLD} />
      <path d="M12.5 34.5 L16 37" />
      <path d="M22 46 l-2 5 M30 46 l-2 5 M38 46 l-2 5 M46 46 l-2 5" />
      <path d="M6 56 q4 -3 8 0 t8 0 t8 0 t8 0 t8 0 t8 0" />
    </>
  ),
  // 신사임당: 포도
  saimdang: (
    <>
      <path d="M32 21 Q33 14 39 11" />
      <path d="M37 15 q8 -9 15 -2 q-7 7 -15 2 Z" fill={SOFT} />
      {[
        [24, 26],
        [32, 26],
        [40, 26],
        [28, 33],
        [36, 33],
        [32, 40],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="4.5" fill="#6b4f8a" stroke="currentColor" />
      ))}
    </>
  ),
  // 정약용: 쌓인 책
  dasan: (
    <>
      <rect x="14" y="42" width="36" height="8" rx="1.5" fill={SOFT} />
      <rect x="18" y="34" width="30" height="8" rx="1.5" />
      <rect x="12" y="26" width="34" height="8" rx="1.5" fill={GOLD} />
      <path d="M18 46 H30 M22 38 H34 M16 30 H28" />
      <path d="M44 22 L52 10" strokeWidth="3" />
      <path d="M52 10 l2 -3" />
    </>
  ),
  // 김구: 둥근 안경
  kimgu: (
    <>
      <circle cx="22" cy="32" r="9" fill={SOFT} />
      <circle cx="42" cy="32" r="9" fill={SOFT} />
      <path d="M31 31 q1 -3 2 0" />
      <path d="M13 30 L6 27 M51 30 L58 27" />
    </>
  ),
  // 안중근: 손바닥 도장
  anjunggeun: (
    <g fill="currentColor" stroke="none" opacity="0.85">
      <ellipse cx="32" cy="41" rx="13" ry="12" />
      <ellipse cx="23" cy="21" rx="3.6" ry="8" />
      <ellipse cx="30.5" cy="18" rx="3.6" ry="9" />
      <ellipse cx="38" cy="23.5" rx="3.6" ry="5" />
      <ellipse cx="44.5" cy="26" rx="3" ry="6" />
      <ellipse cx="17" cy="39" rx="3.6" ry="7" transform="rotate(-35 17 39)" />
    </g>
  ),
  // 유관순: 태극
  yugwansun: (
    <>
      <path d="M16 32 A16 16 0 0 1 48 32 A8 8 0 0 1 32 32 A8 8 0 0 0 16 32 Z" fill="#c9302c" stroke="none" />
      <path d="M16 32 A16 16 0 0 0 48 32 A8 8 0 0 1 32 32 A8 8 0 0 0 16 32 Z" fill="#1f4e9c" stroke="none" />
      <circle cx="32" cy="32" r="16" />
    </>
  ),
  // 방정환: 어린이 바람개비
  bangjunghwan: (
    <>
      <path d="M32 28 V58" />
      {['#c9302c', GOLD, '#1f4e9c', '#7fb8a4'].map((color, i) => (
        <path key={color} d="M32 28 L32 10 A10 10 0 0 1 42 20 Z" transform={`rotate(${i * 90} 32 28)`} fill={color} />
      ))}
      <circle cx="32" cy="28" r="2" fill="currentColor" />
    </>
  ),
  // 윤동주: 별과 달
  yundongju: (
    <>
      <path d="M36 12 a17 17 0 1 0 16 27 a13 13 0 1 1 -16 -27 Z" fill={GOLD} />
      <polygon points={star(14, 16, 5)} fill={SOFT} />
      <polygon points={star(48, 16, 3.5)} fill={SOFT} />
      <polygon points={star(12, 44, 3)} fill={SOFT} />
    </>
  ),
  // 아인슈타인: 원자
  einstein: (
    <>
      <ellipse cx="32" cy="32" rx="22" ry="8" />
      <ellipse cx="32" cy="32" rx="22" ry="8" transform="rotate(60 32 32)" />
      <ellipse cx="32" cy="32" rx="22" ry="8" transform="rotate(120 32 32)" />
      <circle cx="32" cy="32" r="3.5" fill={GOLD} />
    </>
  ),
  // 마리 퀴리: 실험 플라스크
  curie: (
    <>
      <path d="M20 44 H44 L47.5 50 Q48.5 52.5 45.5 52.5 H18.5 Q15.5 52.5 16.5 50 Z" fill="#7fb8a4" stroke="none" />
      <path d="M25 10 H39 M28 10 V26 L16 50 Q14 54 18.5 54 H45.5 Q50 54 48 50 L36 26 V10" />
      <circle cx="30" cy="39" r="1.6" />
      <circle cx="35" cy="34" r="2.1" />
      <circle cx="32" cy="29" r="1.2" />
    </>
  ),
  // 에디슨: 전구
  edison: (
    <>
      <path d="M32 9 C22 9 17 17 17 24 C17 31 22 34 25 39 V44 H39 V39 C42 34 47 31 47 24 C47 17 42 9 32 9 Z" fill={GOLD} />
      <path d="M28 31 L30 27 L32 31 L34 27 L36 31" />
      <path d="M26 48 H38 M27 52 H37 M29 56 H35" />
    </>
  ),
  // 모차르트: 음표
  mozart: (
    <>
      <ellipse cx="22" cy="47" rx="6" ry="4.5" transform="rotate(-20 22 47)" fill="currentColor" />
      <ellipse cx="42" cy="43" rx="6" ry="4.5" transform="rotate(-20 42 43)" fill="currentColor" />
      <path d="M27.5 45 V16 M47.5 41 V12" />
      <path d="M27.5 16 L47.5 12 L47.5 18 L27.5 22 Z" fill="currentColor" />
    </>
  ),
  // 반 고흐: 해바라기
  gogh: (
    <>
      <path d="M32 40 V60" />
      <path d="M32 52 q-9 -2 -12 -9 q8 1 12 9" fill="#6f9a52" />
      {Array.from({ length: 12 }, (_, i) => (
        <ellipse key={i} cx="32" cy="15" rx="3.8" ry="7.5" transform={`rotate(${i * 30} 32 26)`} fill={GOLD} />
      ))}
      <circle cx="32" cy="26" r="7" fill="#6b4a2b" />
    </>
  ),
  // 링컨: 실크햇
  lincoln: (
    <>
      <path d="M22 12 H42 L40 44 H24 Z" fill={SOFT} />
      <ellipse cx="32" cy="46" rx="20" ry="5" fill={SOFT} />
      <path d="M23.5 37 H40.5" stroke={GOLD} strokeWidth="4" />
    </>
  ),
  // 간디: 물레
  gandhi: (
    <>
      <circle cx="26" cy="30" r="16" />
      {[0, 45, 90, 135].map((deg) => (
        <line key={deg} x1="26" y1="14" x2="26" y2="46" transform={`rotate(${deg} 26 30)`} />
      ))}
      <circle cx="26" cy="30" r="3" fill={GOLD} />
      <path d="M10 56 H56 M26 46 L22 56 M26 46 L30 56" />
      <path d="M26 14 Q44 16 52 40" strokeDasharray="2 3" />
      <path d="M48 40 H56" strokeWidth="3" />
    </>
  ),
  // 헬렌 켈러: 점자
  keller: (
    <>
      <rect x="10" y="17" width="44" height="30" rx="5" fill={SOFT} />
      {[
        [20, 24, true],
        [27, 24, false],
        [20, 32, true],
        [27, 32, true],
        [20, 40, false],
        [27, 40, false],
        [38, 24, true],
        [45, 24, true],
        [38, 32, false],
        [45, 32, true],
        [38, 40, true],
        [45, 40, false],
      ].map(([x, y, on]) => (
        <circle key={`${x}-${y}`} cx={x as number} cy={y as number} r="2.4" fill={on ? 'currentColor' : 'none'} />
      ))}
    </>
  ),
};

export function FigureArt({ figureKey, size = 44 }: { figureKey: string; size?: number }) {
  const art = ART[figureKey];
  if (!art) return null;
  return (
    <span className="figure-art" style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="0 0 64 64" width={size * 0.82} height={size * 0.82} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        {art}
      </svg>
    </span>
  );
}

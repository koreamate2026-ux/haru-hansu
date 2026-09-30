import type { ReactNode } from 'react';
import { famousOf } from '../lib/famous';

/**
 * 인물 상징 그림(직접 그린 SVG). 얼굴을 닮게 그리지 않고, 그 사람을 떠올리게 하는 물건을
 * 로고와 같은 먹선으로 그렸다. 선은 currentColor라 글자색을 따라가고, 강조색만 따로 칠한다.
 * 위인은 한 사람마다 그림이 있고, 스타는 분야 그림(마이크·필름·공 등)을 함께 쓴다.
 */
const GOLD = 'var(--gold)';
const SOFT = 'var(--surface-high)';
const RED = '#c9302c';
const BLUE = '#1f4e9c';
const GREEN = '#6f9a52';
const MINT = '#7fb8a4';
const PURPLE = '#6b4f8a';
const BROWN = '#6b4a2b';
const WHITE = '#fffdf7';

function star(cx: number, cy: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = ((-90 + i * 36) * Math.PI) / 180;
    const rr = i % 2 === 0 ? r : r * 0.45;
    pts.push(`${(cx + rr * Math.cos(rad)).toFixed(1)},${(cy + rr * Math.sin(rad)).toFixed(1)}`);
  }
  return pts.join(' ');
}

/** 반짝임(4갈래) */
const sparkle = (x: number, y: number, r: number) => `M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z`;

/** 괘(태극기): bars = 위에서부터 [끊김 여부] */
function trigram(cx: number, cy: number, deg: number, bars: boolean[]) {
  return (
    <g transform={`rotate(${deg} ${cx} ${cy})`} strokeWidth="2">
      {bars.map((broken, i) => {
        const y = cy - 3 + i * 3;
        return broken ? (
          <path key={i} d={`M${cx - 4} ${y} H${cx - 0.8} M${cx + 0.8} ${y} H${cx + 4}`} />
        ) : (
          <path key={i} d={`M${cx - 4} ${y} H${cx + 4}`} />
        );
      })}
    </g>
  );
}

const ART: Record<string, ReactNode> = {
  // ─── 위인 ───
  // 세종대왕: 펼친 훈민정음 책과 책갈피
  sejong: (
    <>
      <path d="M32 50 L32 57" stroke={RED} strokeWidth="3" />
      <path d="M7 16 Q19 11 32 17 Q45 11 57 16 V48 Q45 43 32 49 Q19 43 7 48 Z" fill={SOFT} />
      <path d="M32 17 V49" />
      <path d="M9 50 Q20 46 32 51 Q44 46 55 50" strokeWidth="1.6" />
      <text x="19.5" y="33" fontSize="12" textAnchor="middle" fill="currentColor" stroke="none" fontFamily="var(--font-display)" fontWeight="700">가</text>
      <text x="44.5" y="33" fontSize="12" textAnchor="middle" fill="currentColor" stroke="none" fontFamily="var(--font-display)" fontWeight="700">나</text>
      <path d="M12 39 Q19 37 27 39 M12 43 Q19 41 27 43 M37 39 Q45 37 52 39 M37 43 Q45 41 52 43" strokeWidth="1.3" opacity="0.6" />
    </>
  ),
  // 이순신: 거북선(등판 무늬·용머리·노·깃발)
  yisunsin: (
    <>
      <path d="M44 22 V12 L51 15 L44 18" fill={RED} strokeWidth="1.6" />
      <path d="M8 38 H56 L50 46 H14 Z" fill={BROWN} />
      <path d="M15 38 Q32 18 49 38 Z" fill={SOFT} />
      <path d="M22 38 L25 31 L32 29 L39 31 L42 38 M25 31 L22 27 M32 29 V24 M39 31 L42 27" strokeWidth="1.4" />
      <path d="M19 31 l-2 -2 M24.5 26.5 l-1 -3 M32 24 v-3 M39.5 26.5 l1 -3 M45 31 l2 -2" strokeWidth="1.6" />
      <path d="M6 33 Q8 28 12 30 L16 36 L9 37 Z" fill={GOLD} />
      <path d="M6 30 q-2 -3 0 -6 M3 31 q-2 -3 0 -6" strokeWidth="1.3" opacity="0.6" />
      <path d="M20 46 l-3 6 M27 46 l-3 6 M34 46 l-3 6 M41 46 l-3 6 M48 46 l-3 6" strokeWidth="1.8" />
      <path d="M4 57 q4 -3 8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0" stroke={BLUE} />
    </>
  ),
  // 신사임당: 포도송이와 잎·덩굴손
  saimdang: (
    <>
      <path d="M30 18 Q31 11 38 8" />
      <path d="M36 12 q9 -10 18 -2 q-8 9 -18 2 Z" fill={GREEN} />
      <path d="M37 12 Q45 10 51 11 M44 11 l-2 -4 M44 11 l2 3" strokeWidth="1.3" />
      <path d="M26 17 q-7 -1 -8 -6 q2 -3 4 -1 q1 2 -1 3" strokeWidth="1.4" />
      {[
        [22, 23],
        [30, 22],
        [38, 23],
        [26, 30],
        [34, 30],
        [42, 30],
        [22, 37],
        [30, 37],
        [38, 37],
        [26, 44],
        [34, 44],
        [30, 51],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r="4.4" fill={PURPLE} stroke="currentColor" strokeWidth="1.6" />
          <circle cx={x - 1.4} cy={y - 1.4} r="1" fill={WHITE} stroke="none" opacity="0.8" />
        </g>
      ))}
    </>
  ),
  // 정약용: 거중기(도르래로 돌을 들어 올림)와 책
  dasan: (
    <>
      <path d="M12 54 L24 12 L36 54 M24 12 L48 12 M44 54 L48 12" />
      <path d="M17 38 H31" strokeWidth="1.6" />
      <circle cx="24" cy="16" r="3" fill={GOLD} />
      <circle cx="40" cy="16" r="3" fill={GOLD} />
      <path d="M27 16 V36 M37 16 V30" strokeWidth="1.4" />
      <path d="M21 16 H14 L14 22" strokeWidth="1.4" />
      <rect x="31" y="30" width="12" height="8" rx="2" fill={SOFT} />
      <path d="M40 30 L43 24" strokeWidth="1.4" />
      <rect x="44" y="46" width="14" height="4" rx="1" fill={RED} />
      <rect x="45" y="50" width="13" height="4" rx="1" fill={SOFT} />
      <path d="M6 57 H58" />
    </>
  ),
  // 김구: 둥근 안경과 백범일지
  kimgu: (
    <>
      <path d="M14 44 H50 V56 H14 Z" fill={SOFT} />
      <path d="M18 44 V56" />
      <text x="35" y="53.5" fontSize="7.5" textAnchor="middle" fill="currentColor" stroke="none" fontFamily="var(--font-display)" fontWeight="700">白凡逸志</text>
      <circle cx="21" cy="26" r="10" fill={SOFT} />
      <circle cx="43" cy="26" r="10" fill={SOFT} />
      <path d="M31 25 q1 -3 2 0" />
      <path d="M11 24 L4 20 M53 24 L60 20" />
      <path d="M15 22 q2 -4 6 -5 M37 22 q2 -4 6 -5" stroke={WHITE} strokeWidth="1.8" />
    </>
  ),
  // 안중근: 단지 손도장과 붉은 인장
  anjunggeun: (
    <>
      <rect x="8" y="6" width="48" height="52" rx="3" fill={SOFT} />
      <g fill="currentColor" stroke="none" opacity="0.88">
        <ellipse cx="31" cy="40" rx="11.5" ry="10.5" />
        <ellipse cx="23" cy="22" rx="3.2" ry="7.5" />
        <ellipse cx="30" cy="18.5" rx="3.2" ry="8.5" />
        <ellipse cx="37" cy="24" rx="3.2" ry="4.5" />
        <ellipse cx="43" cy="26.5" rx="2.8" ry="5.8" />
        <ellipse cx="17" cy="38" rx="3.2" ry="6.5" transform="rotate(-35 17 38)" />
      </g>
      <path d="M26 40 q5 3 10 0 M25 44 q6 2 12 0" stroke={WHITE} strokeWidth="1" opacity="0.5" />
      <rect x="45" y="46" width="8" height="8" rx="1" fill={RED} stroke="none" />
      <path d="M47 48.5 H51 M47 51.5 H51 M49 48.5 V51.5" stroke={WHITE} strokeWidth="0.9" />
    </>
  ),
  // 유관순: 태극기(태극과 네 괘)
  yugwansun: (
    <>
      <path d="M6 8 V60" strokeWidth="2.6" />
      <circle cx="6" cy="7" r="2" fill={GOLD} />
      <rect x="8" y="12" width="52" height="36" rx="1.5" fill={WHITE} />
      <g transform="rotate(-34 34 30)">
        <path d="M24 30 A10 10 0 0 1 44 30 A5 5 0 0 1 34 30 A5 5 0 0 0 24 30 Z" fill={RED} stroke="none" />
        <path d="M24 30 A10 10 0 0 0 44 30 A5 5 0 0 1 34 30 A5 5 0 0 0 24 30 Z" fill={BLUE} stroke="none" />
      </g>
      {trigram(17, 19, -56, [false, false, false])}
      {trigram(51, 41, -56, [true, true, true])}
      {trigram(51, 19, 56, [true, false, true])}
      {trigram(17, 41, 56, [false, true, false])}
    </>
  ),
  // 방정환: 어린이 바람개비(접힌 날개와 바람)
  bangjunghwan: (
    <>
      <path d="M32 28 V60" strokeWidth="2.6" />
      {[RED, GOLD, BLUE, MINT].map((color, i) => (
        <g key={color} transform={`rotate(${i * 90} 32 28)`}>
          <path d="M32 28 L32 8 A11 11 0 0 1 43 19 Z" fill={color} />
          <path d="M32 28 L39 13" stroke={WHITE} strokeWidth="1.2" opacity="0.7" />
        </g>
      ))}
      <circle cx="32" cy="28" r="2.4" fill="currentColor" />
      <path d="M50 42 q4 -2 8 0 M48 48 q5 -2 10 0 M6 12 q4 -2 8 0" strokeWidth="1.5" opacity="0.6" />
    </>
  ),
  // 윤동주: 초승달·별과 언덕, 원고지
  yundongju: (
    <>
      <path d="M40 6 a15 15 0 1 0 14 24 a11 11 0 1 1 -14 -24 Z" fill={GOLD} />
      <polygon points={star(14, 12, 4.5)} fill={SOFT} />
      <polygon points={star(26, 24, 2.8)} fill={SOFT} />
      <polygon points={star(9, 28, 2.5)} fill={SOFT} />
      <path d="M4 44 Q18 34 32 42 Q46 34 60 42" />
      <rect x="10" y="46" width="44" height="12" fill={SOFT} strokeWidth="1.6" />
      <path d="M18.8 46 V58 M27.6 46 V58 M36.4 46 V58 M45.2 46 V58" strokeWidth="1.1" />
      <text x="14.4" y="55" fontSize="7" textAnchor="middle" fill="currentColor" stroke="none" fontFamily="var(--font-display)">별</text>
      <text x="23.2" y="55" fontSize="7" textAnchor="middle" fill="currentColor" stroke="none" fontFamily="var(--font-display)">헤</text>
      <text x="32" y="55" fontSize="7" textAnchor="middle" fill="currentColor" stroke="none" fontFamily="var(--font-display)">는</text>
      <text x="40.8" y="55" fontSize="7" textAnchor="middle" fill="currentColor" stroke="none" fontFamily="var(--font-display)">밤</text>
    </>
  ),
  // 아인슈타인: 원자와 E=mc²
  einstein: (
    <>
      <ellipse cx="32" cy="26" rx="22" ry="8" />
      <ellipse cx="32" cy="26" rx="22" ry="8" transform="rotate(60 32 26)" />
      <ellipse cx="32" cy="26" rx="22" ry="8" transform="rotate(120 32 26)" />
      <circle cx="32" cy="26" r="4" fill={GOLD} />
      <circle cx="54" cy="26" r="2.2" fill={BLUE} stroke="none" />
      <circle cx="21" cy="7" r="2.2" fill={BLUE} stroke="none" />
      <circle cx="21" cy="45" r="2.2" fill={BLUE} stroke="none" />
      <text x="32" y="61" fontSize="10" textAnchor="middle" fill="currentColor" stroke="none" fontFamily="Georgia, serif" fontStyle="italic" fontWeight="700">
        E=mc²
      </text>
    </>
  ),
  // 마리 퀴리: 빛나는 플라스크와 시험관
  curie: (
    <>
      <path d="M17 44 H41 L44.5 50 Q45.5 52.5 42.5 52.5 H15.5 Q12.5 52.5 13.5 50 Z" fill={MINT} stroke="none" />
      <path d="M22 10 H36 M25 10 V26 L13 50 Q11 54 15.5 54 H42.5 Q47 54 45 50 L33 26 V10" />
      <circle cx="27" cy="40" r="1.6" />
      <circle cx="32" cy="35" r="2.1" />
      <circle cx="29" cy="30" r="1.2" />
      <path d="M52 20 V50 a3 3 0 0 1 -6 0 V20" />
      <path d="M46 40 H52 V50 a3 3 0 0 1 -6 0 Z" fill={GREEN} stroke="none" />
      <path d="M44 20 H54" />
      <path d="M8 36 l-3 -1 M9 30 l-3 -3 M44 58 l1 3 M14 58 l-1 3" stroke={GOLD} strokeWidth="1.8" />
    </>
  ),
  // 에디슨: 빛나는 전구(필라멘트·나사)
  edison: (
    <>
      <path d="M32 3 V0 M14 10 L11 7 M50 10 L53 7 M7 26 H3 M57 26 H61" stroke={GOLD} strokeWidth="2" />
      <path d="M32 7 C21 7 15 15 15 23 C15 30 20 34 23.5 39 V44 H40.5 V39 C44 34 49 30 49 23 C49 15 43 7 32 7 Z" fill={GOLD} />
      <path d="M24 14 Q20 18 20 23" stroke={WHITE} strokeWidth="1.8" opacity="0.8" />
      <path d="M28 44 V33 L30 29 L32 33 L34 29 L36 33 V44" strokeWidth="1.5" />
      <rect x="23.5" y="44" width="17" height="10" rx="2" fill={SOFT} />
      <path d="M23.5 47.5 L40.5 45.5 M23.5 51 L40.5 49" strokeWidth="1.4" />
      <path d="M28 54 Q32 60 36 54" fill="currentColor" />
    </>
  ),
  // 모차르트: 오선지 위 음표
  mozart: (
    <>
      <path d="M4 22 H60 M4 29 H60 M4 36 H60 M4 43 H60 M4 50 H60" strokeWidth="1.1" opacity="0.55" />
      <ellipse cx="17" cy="46.5" rx="4.6" ry="3.4" transform="rotate(-20 17 46.5)" fill="currentColor" />
      <ellipse cx="31" cy="39.5" rx="4.6" ry="3.4" transform="rotate(-20 31 39.5)" fill="currentColor" />
      <ellipse cx="47" cy="32.5" rx="4.6" ry="3.4" transform="rotate(-20 47 32.5)" fill={GOLD} />
      <path d="M21.2 45 V14 M35.2 38 V10" />
      <path d="M21.2 14 L35.2 10 L35.2 15 L21.2 19 Z" fill="currentColor" />
      <path d="M51.2 31 V6 Q56 10 57 16" />
      <path d="M8 12 l0 12 M11 11 l0 12 M6 16 l7 -2 M6 20 l7 -2" strokeWidth="1.4" />
    </>
  ),
  // 반 고흐: 해바라기(두 겹 꽃잎·씨앗)와 소용돌이 하늘
  gogh: (
    <>
      <path d="M50 10 q6 -3 8 3 q-1 5 -6 3 q-3 -2 0 -3" stroke={BLUE} strokeWidth="1.6" />
      <path d="M4 14 q5 -5 10 -1" stroke={BLUE} strokeWidth="1.6" />
      <path d="M32 40 V61" strokeWidth="2.6" stroke={GREEN} />
      <path d="M32 52 q-10 -1 -14 -9 q9 0 14 9 Z" fill={GREEN} />
      <path d="M32 48 q9 -2 12 -9 q-8 1 -12 9 Z" fill={GREEN} />
      {Array.from({ length: 12 }, (_, i) => (
        <ellipse key={`b${i}`} cx="32" cy="12" rx="3.4" ry="7.5" transform={`rotate(${i * 30 + 15} 32 25)`} fill="#d99a2b" strokeWidth="1.4" />
      ))}
      {Array.from({ length: 12 }, (_, i) => (
        <ellipse key={`f${i}`} cx="32" cy="14" rx="3.2" ry="6.5" transform={`rotate(${i * 30} 32 25)`} fill={GOLD} strokeWidth="1.4" />
      ))}
      <circle cx="32" cy="25" r="7.5" fill={BROWN} />
      {[
        [29, 23],
        [32, 22],
        [35, 23],
        [29, 27],
        [32, 26],
        [35, 27],
        [32, 29.5],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="0.8" fill={GOLD} stroke="none" />
      ))}
    </>
  ),
  // 링컨: 실크햇(띠·주름)과 별
  lincoln: (
    <>
      <path d="M21 10 Q32 7 43 10 L41 44 H23 Z" fill={SOFT} />
      <path d="M22.5 34 Q32 36 41.5 34 L41 41 Q32 43 23 41 Z" fill="currentColor" />
      <path d="M27 12 V32 M37 12 V32" strokeWidth="1.2" opacity="0.4" />
      <ellipse cx="32" cy="46" rx="22" ry="5.5" fill={SOFT} />
      <polygon points={star(10, 16, 4)} fill={RED} stroke="none" />
      <polygon points={star(54, 16, 4)} fill={BLUE} stroke="none" />
      <polygon points={star(32, 58, 3)} fill={GOLD} stroke="none" />
    </>
  ),
  // 간디: 물레와 실
  gandhi: (
    <>
      <circle cx="24" cy="28" r="17" />
      <circle cx="24" cy="28" r="13" strokeWidth="1.2" opacity="0.6" />
      {[0, 30, 60, 90, 120, 150].map((deg) => (
        <line key={deg} x1="24" y1="11" x2="24" y2="45" transform={`rotate(${deg} 24 28)`} strokeWidth="1.6" />
      ))}
      <circle cx="24" cy="28" r="3.2" fill={GOLD} />
      <path d="M24 28 L10 22" strokeWidth="2.4" />
      <path d="M6 58 H58 M24 45 L18 58 M24 45 L30 58" />
      <path d="M24 11 Q44 12 50 44" strokeDasharray="2 3" />
      <path d="M44 44 H58" strokeWidth="3" />
      <ellipse cx="51" cy="44" rx="3" ry="4" fill={WHITE} />
    </>
  ),
  // 헬렌 켈러: 점자 카드와 물방울(w-a-t-e-r)
  keller: (
    <>
      <path d="M50 4 Q56 12 56 16 a6 6 0 0 1 -12 0 Q44 12 50 4 Z" fill={BLUE} stroke="none" />
      <path d="M47 16 q0 2 2 3" stroke={WHITE} strokeWidth="1.4" />
      <rect x="6" y="22" width="48" height="32" rx="5" fill={SOFT} />
      <path d="M44 22 L54 32" strokeWidth="1.4" opacity="0.5" />
      {[
        [15, 30, true],
        [21, 30, false],
        [15, 37, true],
        [21, 37, true],
        [15, 44, false],
        [21, 44, true],
        [31, 30, true],
        [37, 30, false],
        [31, 37, false],
        [37, 37, false],
        [31, 44, false],
        [37, 44, false],
      ].map(([x, y, on]) => (
        <circle key={`${x}-${y}`} cx={x as number} cy={y as number} r="2.2" fill={on ? 'currentColor' : 'none'} strokeWidth="1.4" />
      ))}
      <path d="M44 38 H48 M44 44 H50" strokeWidth="1.4" opacity="0.5" />
    </>
  ),

  // ─── 스타(분야 그림) ───
  // 마이크와 음파
  mic: (
    <>
      <rect x="23" y="6" width="18" height="26" rx="9" fill={SOFT} />
      <path d="M23 15 H41 M23 21 H41 M28 7 V31 M36 7 V31" strokeWidth="1.1" opacity="0.6" />
      <path d="M17 24 a15 15 0 0 0 30 0" />
      <path d="M32 39 V50 M22 54 H42" strokeWidth="2.6" />
      <path d="M10 14 q-4 6 0 12 M5 11 q-6 9 0 18 M54 14 q4 6 0 12 M59 11 q6 9 0 18" stroke={GOLD} strokeWidth="1.8" />
    </>
  ),
  // 무대 조명과 별
  stage: (
    <>
      <path d="M14 8 L4 52 H30 Z M50 8 L60 52 H34 Z" fill={GOLD} stroke="none" opacity="0.25" />
      <rect x="9" y="4" width="10" height="7" rx="2" fill="currentColor" />
      <rect x="45" y="4" width="10" height="7" rx="2" fill="currentColor" />
      <polygon points={star(32, 34, 13)} fill={GOLD} />
      <path d={sparkle(14, 30, 4)} fill={SOFT} strokeWidth="1.4" />
      <path d={sparkle(51, 26, 3.5)} fill={SOFT} strokeWidth="1.4" />
      <path d="M4 56 H60" strokeWidth="3" />
    </>
  ),
  // 헤드폰과 음표
  headphones: (
    <>
      <path d="M12 38 V32 a20 20 0 0 1 40 0 V38" strokeWidth="3" />
      <rect x="7" y="34" width="11" height="18" rx="4" fill={GOLD} />
      <rect x="46" y="34" width="11" height="18" rx="4" fill={GOLD} />
      <path d="M11 39 V47 M53 39 V47" stroke={WHITE} strokeWidth="1.6" />
      <ellipse cx="29" cy="50" rx="3.5" ry="2.6" fill="currentColor" />
      <path d="M32.5 50 V38 L38 40" />
    </>
  ),
  // 미러볼과 반짝임
  dance: (
    <>
      <path d="M32 2 V12" />
      <circle cx="32" cy="30" r="18" fill={SOFT} />
      <path d="M14 30 H50 M16.5 21 H47.5 M16.5 39 H47.5 M21 14 H43 M21 46 H43" strokeWidth="1.2" />
      <path d="M32 12 Q22 30 32 48 M32 12 Q42 30 32 48 M32 12 V48" strokeWidth="1.2" />
      <path d="M36 16 h5 v5 h-5 Z M42 24 h5 v5 h-5 Z" fill={GOLD} stroke="none" />
      <path d={sparkle(8, 12, 4)} fill={GOLD} stroke="none" />
      <path d={sparkle(56, 48, 4.5)} fill={GOLD} stroke="none" />
      <path d={sparkle(10, 54, 3)} fill={MINT} stroke="none" />
    </>
  ),
  // 통기타
  guitar: (
    <>
      <g transform="rotate(35 32 32)">
        <path d="M32 26 C24 26 21 32 23 37 C18 40 18 50 24 54 C28 57 36 57 40 54 C46 50 46 40 41 37 C43 32 40 26 32 26 Z" fill={GOLD} />
        <circle cx="32" cy="41" r="4.5" fill="currentColor" />
        <rect x="29.5" y="2" width="5" height="26" rx="1" fill={SOFT} />
        <path d="M29.5 8 H34.5 M29.5 14 H34.5 M29.5 20 H34.5" strokeWidth="1" />
        <rect x="28" y="-2" width="8" height="6" rx="1.5" fill="currentColor" />
        <path d="M31 4 V50 M33 4 V50" strokeWidth="0.7" />
        <path d="M27 50 H37" strokeWidth="2" />
      </g>
    </>
  ),
  // 영화 슬레이트
  film: (
    <>
      <rect x="8" y="26" width="48" height="30" rx="3" fill={SOFT} />
      <path d="M8 26 L54 10 L56 17 L10 33" fill="currentColor" />
      <path d="M17 23 L22 29 M28 19 L33 25 M39 15 L44 21" stroke={WHITE} strokeWidth="3" />
      <path d="M8 34 H56" />
      <path d="M14 42 H30 M14 48 H38" strokeWidth="1.6" />
      <circle cx="46" cy="45" r="5" fill={RED} stroke="none" />
    </>
  ),
  // 영화 촬영기(필름 릴 둘)
  camera: (
    <>
      <circle cx="18" cy="17" r="10" fill={SOFT} />
      <circle cx="40" cy="15" r="8" fill={SOFT} />
      <circle cx="18" cy="17" r="3" fill="currentColor" />
      <circle cx="40" cy="15" r="2.5" fill="currentColor" />
      <path d="M18 9 v2 M18 23 v2 M10 17 h2 M24 17 h2 M40 9 v2 M40 19 v2" strokeWidth="1.4" />
      <rect x="8" y="28" width="36" height="22" rx="3" fill={GOLD} />
      <path d="M44 34 L57 27 V51 L44 44 Z" fill={SOFT} />
      <circle cx="16" cy="36" r="2" fill={RED} stroke="none" />
      <path d="M18 50 L12 60 M34 50 L40 60 M26 50 V60" strokeWidth="2" />
    </>
  ),
  // 예능 TV
  tv: (
    <>
      <path d="M24 6 L32 14 L42 4" />
      <circle cx="24" cy="6" r="2" fill={GOLD} />
      <circle cx="42" cy="4" r="2" fill={GOLD} />
      <rect x="6" y="14" width="52" height="38" rx="6" fill={SOFT} />
      <rect x="11" y="19" width="34" height="28" rx="4" fill={GOLD} />
      <path d="M24 27 L34 33 L24 39 Z" fill={WHITE} stroke="none" />
      <circle cx="51.5" cy="24" r="2.5" fill="currentColor" />
      <circle cx="51.5" cy="32" r="2.5" />
      <path d="M49 40 H54 M49 44 H54" strokeWidth="1.4" />
      <path d="M16 52 L12 58 M48 52 L52 58" />
    </>
  ),
  // 축구공
  soccer: (
    <>
      <circle cx="32" cy="30" r="22" fill={WHITE} />
      <polygon points="32,21 40.6,27.2 37.3,37.3 26.7,37.3 23.4,27.2" fill="currentColor" />
      <path d="M32 21 V8.5 M40.6 27.2 L52 23 M37.3 37.3 L44.5 47.5 M26.7 37.3 L19.5 47.5 M23.4 27.2 L12 23" />
      <path d="M26 9 L32 8.5 L38 9.5 M49 17 L52 23 L53 30 M48 47 L44.5 47.5 L38 51 M26 51 L19.5 47.5 L15 44 M11 30 L12 23 L15 17" fill="none" strokeWidth="1.6" />
      <path d="M6 58 H58" strokeWidth="1.6" opacity="0.5" />
      <path d="M8 40 h-5 M9 46 h-4" strokeWidth="1.6" opacity="0.6" />
    </>
  ),
  // 피겨 스케이트
  skate: (
    <>
      <path d="M18 8 H32 V30 Q48 30 52 38 Q54 44 48 44 H14 Q12 44 12 40 Z" fill={WHITE} />
      <path d="M20 14 L28 16 M20 20 L28 22 M20 26 L28 28" strokeWidth="1.4" />
      <path d="M12 40 H52" stroke={GOLD} strokeWidth="2.2" />
      <path d="M16 44 V50 M46 44 V50" strokeWidth="2" />
      <path d="M8 50 H52 Q58 50 58 46" strokeWidth="2.6" />
      <path d="M8 50 q-3 0 -3 -3 l2 -1" strokeWidth="2" />
      <path d="M4 58 q8 -3 16 0 t16 0" stroke={MINT} strokeWidth="1.6" />
      <path d={sparkle(54, 14, 4)} fill={MINT} stroke="none" />
    </>
  ),
  // 야구공과 배트
  baseball: (
    <>
      <path d="M44 8 L56 20 L26 50 Q22 54 18 50 L16 48 Q12 44 16 40 Z" fill={GOLD} />
      <path d="M14 50 L8 56" strokeWidth="4" />
      <circle cx="22" cy="20" r="14" fill={WHITE} />
      <path d="M12 10 Q20 20 12 30 M32 10 Q24 20 32 30" stroke={RED} strokeWidth="1.6" />
      <path d="M13.5 13 l2 -1 M15.5 17 l2 -.5 M15.5 23 l2 .5 M13.5 27 l2 1 M30.5 13 l-2 -1 M28.5 17 l-2 -.5 M28.5 23 l-2 .5 M30.5 27 l-2 1" stroke={RED} strokeWidth="1.2" />
    </>
  ),
  // 농구공과 골대
  basketball: (
    <>
      <rect x="34" y="4" width="26" height="18" rx="2" fill={SOFT} />
      <rect x="42" y="10" width="10" height="7" strokeWidth="1.4" />
      <path d="M38 22 H56" stroke={RED} strokeWidth="2.6" />
      <path d="M39 22 L42 32 H52 L55 22 M44 22 L45 32 M50 22 L49 32" strokeWidth="1.2" />
      <circle cx="22" cy="40" r="17" fill="#d97a2b" />
      <path d="M5 40 H39 M22 23 V57" strokeWidth="1.6" />
      <path d="M10 28 Q18 40 10 52 M34 28 Q26 40 34 52" strokeWidth="1.6" />
    </>
  ),
};

/** figureKey: 인물 key(famous.ts) 또는 그림 이름 */
export function FigureArt({ figureKey, size = 44 }: { figureKey: string; size?: number }) {
  const art = ART[figureKey] ?? ART[famousOf(figureKey)?.art ?? ''];
  if (!art) return null;
  return (
    <span className="figure-art" style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="0 0 64 64" width={size * 0.82} height={size * 0.82} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" overflow="visible">
        {art}
      </svg>
    </span>
  );
}

/** 로또 6/45 1회 추첨: 2002-12-07(토) 20:35 KST = 11:35 UTC */
const FIRST_DRAW_UTC = Date.UTC(2002, 11, 7, 11, 35);
const WEEK = 7 * 24 * 60 * 60 * 1000;
const KST = 9 * 60 * 60 * 1000;

/** 가장 최근에 추첨이 끝난 회차 */
export function latestDrawnRound(now = Date.now()): number {
  return Math.floor((now - FIRST_DRAW_UTC) / WEEK) + 1;
}

/** 아직 추첨 전인 이번 주 회차 (번호 추천 대상) */
export function upcomingRound(now = Date.now()): number {
  return latestDrawnRound(now) + 1;
}

export function drawTime(round: number): number {
  return FIRST_DRAW_UTC + (round - 1) * WEEK;
}

/** 회차의 추첨일 (한국 날짜) */
export function drawDate(round: number): { y: number; m: number; d: number; label: string } {
  const k = new Date(drawTime(round) + KST);
  const y = k.getUTCFullYear();
  const m = k.getUTCMonth() + 1;
  const d = k.getUTCDate();
  return { y, m, d, label: `${y}.${String(m).padStart(2, '0')}.${String(d).padStart(2, '0')}` };
}

/** 오늘의 한국 날짜 */
export function todayKST(now = Date.now()) {
  const k = new Date(now + KST);
  return { y: k.getUTCFullYear(), m: k.getUTCMonth() + 1, d: k.getUTCDate() };
}

export function isDrawn(round: number, now = Date.now()) {
  return round <= latestDrawnRound(now);
}

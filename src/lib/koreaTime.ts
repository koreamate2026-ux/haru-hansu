/**
 * 한국 표준시 연혁 (IANA tz database 'Asia/Seoul'에서 추출)
 * [전환 시각(UTC, ms), UTC 오프셋(분), 그중 서머타임(분)]
 *
 * lunar-javascript는 절기 시각을 중국 표준시(UTC+8)로 계산하므로,
 * 한국 시각을 그대로 넣으면 절기 경계가 1시간(1954~61년은 30분) 어긋납니다.
 * 이 표로 출생 시각을 UTC → UTC+8로 바꿔 연주·월주를 구합니다.
 */
const TRANSITIONS: [number, number, number][] = [
  [Date.UTC(1900, 0, 1, 0, 0), 507, 0],
  [Date.UTC(1908, 2, 31, 16, 0), 510, 0],
  [Date.UTC(1911, 11, 31, 16, 0), 540, 0],
  [Date.UTC(1948, 4, 31, 15, 0), 600, 60],
  [Date.UTC(1948, 8, 12, 14, 0), 540, 0],
  [Date.UTC(1949, 3, 2, 15, 0), 600, 60],
  [Date.UTC(1949, 8, 10, 14, 0), 540, 0],
  [Date.UTC(1950, 2, 31, 15, 0), 600, 60],
  [Date.UTC(1950, 8, 9, 14, 0), 540, 0],
  [Date.UTC(1951, 4, 5, 15, 0), 600, 60],
  [Date.UTC(1951, 8, 8, 14, 0), 540, 0],
  [Date.UTC(1954, 2, 20, 15, 0), 510, 0],
  [Date.UTC(1955, 4, 4, 16, 0), 570, 60],
  [Date.UTC(1955, 8, 8, 15, 0), 510, 0],
  [Date.UTC(1956, 4, 19, 16, 0), 570, 60],
  [Date.UTC(1956, 8, 29, 15, 0), 510, 0],
  [Date.UTC(1957, 4, 4, 16, 0), 570, 60],
  [Date.UTC(1957, 8, 21, 15, 0), 510, 0],
  [Date.UTC(1958, 4, 3, 16, 0), 570, 60],
  [Date.UTC(1958, 8, 20, 15, 0), 510, 0],
  [Date.UTC(1959, 4, 2, 16, 0), 570, 60],
  [Date.UTC(1959, 8, 19, 15, 0), 510, 0],
  [Date.UTC(1960, 3, 30, 16, 0), 570, 60],
  [Date.UTC(1960, 8, 17, 15, 0), 510, 0],
  [Date.UTC(1961, 7, 9, 16, 0), 540, 0],
  [Date.UTC(1987, 4, 9, 17, 0), 600, 60],
  [Date.UTC(1987, 9, 10, 17, 0), 540, 0],
  [Date.UTC(1988, 4, 7, 17, 0), 600, 60],
  [Date.UTC(1988, 9, 8, 17, 0), 540, 0],
];

function offsetAt(utcMs: number): { offset: number; dst: number } {
  let cur = TRANSITIONS[0];
  for (const t of TRANSITIONS) {
    if (t[0] <= utcMs) cur = t;
    else break;
  }
  return { offset: cur[1], dst: cur[2] };
}

export interface Clock {
  y: number;
  m: number;
  d: number;
  h: number;
  mi: number;
}

const toClock = (ms: number): Clock => {
  const t = new Date(ms);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), h: t.getUTCHours(), mi: t.getUTCMinutes() };
};

/**
 * 한국 시계 시각 → (1) 중국 표준시 시각(절기 판정용), (2) 서머타임을 뺀 한국 표준시각(일주·시주용)
 */
export function convertKoreanClock(c: Clock) {
  const asUtc = Date.UTC(c.y, c.m - 1, c.d, c.h, c.mi);
  let { offset, dst } = offsetAt(asUtc - 540 * 60000);
  const utc = asUtc - offset * 60000;
  ({ offset, dst } = offsetAt(utc));
  const realUtc = asUtc - offset * 60000;
  return {
    chinaTime: toClock(realUtc + 480 * 60000),
    standardLocal: toClock(asUtc - dst * 60000),
    offsetMinutes: offset,
    dstMinutes: dst,
  };
}

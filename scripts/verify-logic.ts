/**
 * 핵심 로직 검증 스크립트:  npm test
 * 만세력 결과를 신뢰할 수 있는 만세력(예: 한국천문연구원 음양력 변환, 검증된 만세력 사이트)과 비교해 보세요.
 */
import { computeChart, toSolar, BirthDateError } from '../src/lib/saju';
import { recommend, checkTicket } from '../src/lib/lotto';
import { dailyFortune } from '../src/lib/fortune';
import { latestDrawnRound, drawDate } from '../src/lib/rounds';
import { numberElement, ELEMENTS } from '../src/lib/elements';
import type { Profile } from '../src/lib/types';

let failed = 0;
const eq = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  → ${JSON.stringify(got)}${ok ? '' : `  (기대값 ${JSON.stringify(want)})`}`);
};
const mk = (o: Partial<Profile>): Profile => ({
  id: 't', name: '테스트', calendar: 'solar', leapMonth: false, year: 1990, month: 5, day: 17, hour: 14, minute: 30, bloodType: null, familyEvents: [], createdAt: 0, ...o,
});

// 1. 만세력 기준 케이스
const c1 = computeChart(mk({ year: 2000, month: 11, day: 1, hour: 12, minute: 0 }));
eq('2000-11-01 일주 = 계해', c1.pillars.day.stem + c1.pillars.day.branch, '癸亥');
eq('2000-11-01 연주/월주', c1.pillars.year.stem + c1.pillars.year.branch + ' ' + c1.pillars.month.stem + c1.pillars.month.branch, '庚辰 丙戌');

// 입춘 경계: 2024년 입춘은 2월 4일 17:27 → 그 전은 계묘년, 그 후는 갑진년
eq('2024-02-04 12시 연주 = 계묘(입춘 전)', computeChart(mk({ year: 2024, month: 2, day: 4, hour: 12, minute: 0 })).pillars.year.stem + computeChart(mk({ year: 2024, month: 2, day: 4, hour: 12, minute: 0 })).pillars.year.branch, '癸卯');
const after = computeChart(mk({ year: 2024, month: 2, day: 4, hour: 18, minute: 0 }));
eq('2024-02-04 18시 연주 = 갑진(입춘 후)', after.pillars.year.stem + after.pillars.year.branch, '甲辰');

// 한국 시각 → 절기 판정 보정: 1999 입춘 15:57 KST (중국 표준시 14:57)
const b99 = computeChart(mk({ year: 1999, month: 2, day: 4, hour: 15, minute: 30 }));
eq('1999-02-04 15:30 KST 연주 = 무인(입춘 전)', b99.pillars.year.stem + b99.pillars.year.branch, '戊寅');

// 서머타임: 1987-07-01 09:30(시계) → 표준시 08:30 → 진시
const dst = computeChart(mk({ year: 1987, month: 7, day: 1, hour: 9, minute: 30 }));
eq('1987 서머타임 보정 → 진시', dst.pillars.time!.branch, '辰');
eq('서머타임 보정 표시', dst.dstAdjusted, true);

// 음력/윤달 변환
eq('음력 1990 윤5월 10일 → 양력', toSolar(mk({ calendar: 'lunar', leapMonth: true, year: 1990, month: 5, day: 10 })).toYmd(), '1990-07-02');
let threw = false;
try { toSolar(mk({ calendar: 'lunar', leapMonth: true, year: 1991, month: 5, day: 10 })); } catch (e) { threw = e instanceof BirthDateError; }
eq('없는 윤달은 오류', threw, true);
threw = false;
try { toSolar(mk({ year: 2023, month: 2, day: 30 })); } catch (e) { threw = e instanceof BirthDateError; }
eq('2월 30일은 오류', threw, true);

// 시간 모름 → 시주 없음, 오행 합계 7
const noTime = computeChart(mk({ hour: null }));
eq('시간 모름 → 시주 null', noTime.pillars.time, null);
eq('시간 모름 → 합계 7', noTime.total, 7);
eq('시간 있음 → 합계 9', computeChart(mk({})).total, 9);

// 2. 회차 계산
eq('2025-12-13 추첨 = 1202회', drawDate(1202).label, '2025.12.13');
eq('1202회 직후 최신 회차', latestDrawnRound(Date.UTC(2025, 11, 13, 12, 0)), 1202);
eq('1202회 추첨 직전 최신 회차', latestDrawnRound(Date.UTC(2025, 11, 13, 11, 0)), 1201);

// 3. 번호 오행 분배: 각 오행 9개씩
eq('오행별 번호 수', ELEMENTS.map((e) => Array.from({ length: 45 }, (_, i) => i + 1).filter((n) => numberElement(n) === e).length), [9, 9, 9, 9, 9]);

// 4. 추천: 결정성, 형식, 용신 포함
const p = mk({});
const chart = computeChart(p);
const r1 = recommend(p, chart, 1240, 0);
const r2 = recommend(p, chart, 1240, 0);
eq('같은 입력 → 같은 번호', r1.numbers, r2.numbers);
eq('6개·중복 없음·1~45', new Set(r1.numbers).size === 6 && r1.numbers.every((n) => n >= 1 && n <= 45), true);
eq('다음 회차는 다른 번호', JSON.stringify(recommend(p, chart, 1241, 0).numbers) !== JSON.stringify(r1.numbers), true);

let usefulMissing = 0;
const freq = new Array(46).fill(0);
for (let round = 1; round <= 3000; round++) {
  const r = recommend(p, chart, round, 0);
  if (!r.numbers.some((n) => numberElement(n) === chart.usefulElement)) usefulMissing++;
  r.numbers.forEach((n) => freq[n]++);
}
eq('3000회 모두 용신 번호 포함', usefulMissing, 0);
const byEl = ELEMENTS.map((e) => freq.reduce((s, f, n) => (n > 0 && numberElement(n) === e ? s + f : s), 0));
console.log('      오행별 출현 비율(3000회):', ELEMENTS.map((e, i) => `${e} ${(byEl[i] / 180).toFixed(1)}%`).join(', '));
console.log('      사주:', chart.pillars.year.stem + chart.pillars.year.branch, chart.pillars.month.stem + chart.pillars.month.branch, chart.pillars.day.stem + chart.pillars.day.branch, chart.pillars.time!.stem + chart.pillars.time!.branch, chart.counts, chart.strength, '용신', chart.usefulElement);
console.log('      추천 예시:', r1.numbers.join(', '));
r1.reasons.forEach((s) => console.log('      -', s));

// 5. 당첨 비교
const draw = { round: 1, date: '', numbers: [1, 2, 3, 4, 5, 6], bonus: 7, source: 'manual' as const };
eq('1등', checkTicket([1, 2, 3, 4, 5, 6], draw).rank, 1);
eq('2등', checkTicket([1, 2, 3, 4, 5, 7], draw).rank, 2);
eq('3등', checkTicket([1, 2, 3, 4, 5, 9], draw).rank, 3);
eq('5등', checkTicket([1, 2, 3, 40, 41, 42], draw).rank, 5);
eq('낙첨', checkTicket([1, 2, 40, 41, 42, 43], draw).rank, null);

// 6. 오늘의 운세
const f = dailyFortune(p, chart, Date.UTC(2026, 8, 24, 3));
eq('운세 점수 범위', f.score >= 40 && f.score <= 98, true);
console.log('      오늘의 운세:', f.todayPillar.stemKo + f.todayPillar.branchKo, f.relationName, f.score, f.headline);

console.log(failed ? `\n${failed}개 실패` : '\n모두 통과');
process.exit(failed ? 1 : 0);

import { ELEMENTS, ELEMENT_INFO, numberElement, withJosa } from './elements';
import { hashString, seededRandom } from './random';
import { drawDate } from './rounds';
import { dayGanzhi, type Pillar, type SajuChart } from './saju';
import type { DrawResult, Element, Profile } from './types';

export interface Recommendation {
  round: number;
  setIndex: number;
  numbers: number[];
  weights: Record<Element, number>;
  drawDayPillar: Pillar;
  reasons: string[];
}

const MAX_PER_ELEMENT = 3;

/** 회차별 오행 가중치: 부족한 오행 보충 + 용신 + 추첨일 일진 */
export function elementWeights(chart: SajuChart, drawPillar: Pillar): Record<Element, number> {
  const avg = chart.total / 5;
  const w = {} as Record<Element, number>;
  for (const e of ELEMENTS) {
    const deficit = Math.max(0, avg - chart.counts[e]) / avg; // 0 ~ 1
    let v = 1 + 0.8 * deficit;
    if (e === chart.usefulElement) v += 0.7;
    if (e === drawPillar.stemElement) v += 0.3;
    if (chart.excessive.includes(e)) v -= 0.3;
    w[e] = Math.max(0.4, Math.round(v * 100) / 100);
  }
  return w;
}

function seedKey(p: Profile, round: number, setIndex: number) {
  return [p.calendar, p.leapMonth ? 'L' : '', p.year, p.month, p.day, p.hour ?? 'x', p.minute, p.name.trim(), round, setIndex].join('|');
}

export function recommend(profile: Profile, chart: SajuChart, round: number, setIndex = 0): Recommendation {
  const dd = drawDate(round);
  const drawPillar = dayGanzhi(dd.y, dd.m, dd.d);
  const weights = elementWeights(chart, drawPillar);
  const rand = seededRandom(hashString(seedKey(profile, round, setIndex)));

  const picked: number[] = [];
  const perElement: Record<Element, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };

  while (picked.length < 6) {
    const pool: { n: number; w: number }[] = [];
    let sum = 0;
    for (let n = 1; n <= 45; n++) {
      if (picked.includes(n)) continue;
      const e = numberElement(n);
      if (perElement[e] >= MAX_PER_ELEMENT) continue;
      sum += weights[e];
      pool.push({ n, w: weights[e] });
    }
    let r = rand() * sum;
    let choice = pool[pool.length - 1].n;
    for (const item of pool) {
      r -= item.w;
      if (r <= 0) {
        choice = item.n;
        break;
      }
    }
    picked.push(choice);
    perElement[numberElement(choice)]++;
  }

  // 용신 오행 번호가 하나도 없으면 가중치가 가장 낮은 번호 하나를 용신 번호로 교체
  const useful = chart.usefulElement;
  if (perElement[useful] === 0) {
    const weakest = picked.reduce((a, b) => (weights[numberElement(b)] < weights[numberElement(a)] ? b : a));
    const candidates = ELEMENT_INFO[useful].digits
      .flatMap((d) => [d, d + 10, d + 20, d + 30, d + 40])
      .filter((n) => n >= 1 && n <= 45 && !picked.includes(n));
    const replacement = candidates[Math.floor(rand() * candidates.length)];
    picked[picked.indexOf(weakest)] = replacement;
  }

  const numbers = [...picked].sort((a, b) => a - b);
  return { round, setIndex, numbers, weights, drawDayPillar: drawPillar, reasons: explain(chart, drawPillar, numbers) };
}

function explain(chart: SajuChart, drawPillar: Pillar, numbers: number[]): string[] {
  const reasons: string[] = [];
  const u = ELEMENT_INFO[chart.usefulElement];
  const usefulNums = numbers.filter((n) => numberElement(n) === chart.usefulElement);
  reasons.push(
    `당신에게 가장 필요한 기운은 ${withJosa(u.name, '이에요', '예요')}. 그래서 ${u.name} 번호(끝자리 ${u.digits.join('·')})인 ${usefulNums.join(', ')}번을 꼭 넣었어요.`,
  );
  const missing = chart.lacking.filter((e) => e !== chart.usefulElement && chart.counts[e] === 0);
  if (missing.length) {
    const names = missing.map((e) => ELEMENT_INFO[e].name).join('·');
    const filled = numbers.filter((n) => missing.includes(numberElement(n)));
    reasons.push(
      filled.length
        ? `타고난 기운 중에 ${withJosa(names, '이', '가')} 하나도 없어서, 채워 주려고 ${filled.join(', ')}번을 넣었어요.`
        : `타고난 기운 중에 ${withJosa(names, '이', '가')} 하나도 없어서 그 번호가 잘 나오게 했어요. 이번 조합엔 안 들어왔지만 다른 조합에서 자주 보일 거예요.`,
    );
  }
  const d = ELEMENT_INFO[drawPillar.stemElement];
  reasons.push(
    `추첨하는 토요일은 ${d.name} 기운이 강한 날이라, ${d.name} 번호가 조금 더 잘 나오게 했어요.`,
  );
  if (chart.excessive.length) {
    const names = chart.excessive.map((e) => ELEMENT_INFO[e].name).join('·');
    reasons.push(`${names} 기운은 이미 넘치게 타고나서, ${names} 번호는 덜 나오게 했어요.`);
  }
  return reasons;
}

export interface MatchResult {
  matched: number[];
  bonusMatched: boolean;
  rank: 1 | 2 | 3 | 4 | 5 | null;
}

export function checkTicket(numbers: number[], draw: DrawResult): MatchResult {
  const matched = numbers.filter((n) => draw.numbers.includes(n));
  const bonusMatched = numbers.includes(draw.bonus);
  const c = matched.length;
  const rank = c === 6 ? 1 : c === 5 && bonusMatched ? 2 : c === 5 ? 3 : c === 4 ? 4 : c === 3 ? 5 : null;
  return { matched, bonusMatched, rank };
}

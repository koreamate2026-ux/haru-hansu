/**
 * AI 가족 궁합 풀이 샘플 만들기(품질 확인용).
 *   npx tsx scripts/ai-sample.ts --dry   ← AI에 보낼 사실만 출력(키 없이, 비용 없음)
 *   ANTHROPIC_API_KEY=... npx tsx scripts/ai-sample.ts   ← 실제로 풀이를 만들어 출력(건당 비용 발생)
 * 앱과 같은 규칙(src/lib/compatDetail)으로 사실을 만들어서, 화면과 똑같은 입력으로 확인할 수 있다.
 */
import { analyzePair, familyPersonalities, type FamilyRel } from '../../src/lib/compatDetail';
import { buildPairFacts, restoreNames } from '../../src/lib/aiFacts';
import { computeChart } from '../../src/lib/saju';
import type { Profile } from '../../src/lib/types';
import { generatePair, pairFactsSchema } from '../src/lib/ai';

const P = (id: string, name: string, y: number, m: number, d: number, h: number | null, gender: 'M' | 'F'): Profile => ({
  id, name, calendar: 'solar', leapMonth: false, year: y, month: m, day: d, hour: h, minute: 0, bloodType: null, gender, familyEvents: [], createdAt: 0,
});

const SAMPLES: [Profile, Profile, FamilyRel][] = [
  [P('a1', '재호', 1990, 9, 1, 9, 'M'), P('a2', '엄마', 1962, 5, 28, null, 'F'), 'mother'],
  [P('b1', '재호', 1990, 9, 1, 9, 'M'), P('b2', '지수', 1992, 3, 14, null, 'F'), 'spouse'],
  [P('c1', '지수', 1992, 3, 14, null, 'F'), P('c2', '도윤', 2020, 12, 20, null, 'M'), 'child'],
];

const dry = process.argv.includes('--dry');

for (const [x, y, rel] of SAMPLES) {
  const cx = computeChart(x);
  const cy = computeChart(y);
  const traits = familyPersonalities([{ id: x.id, chart: cx }, { id: y.id, chart: cy }]);
  const analysis = analyzePair({ ...x, chart: cx }, { ...y, chart: cy }, rel);
  const facts = buildPairFacts({ name: x.name, chart: cx, trait: traits[x.id] }, { name: y.name, chart: cy, trait: traits[y.id] }, rel, analysis);
  const check = pairFactsSchema.safeParse(facts);
  console.log(`\n=== ${x.name} ↔ ${y.name} (${rel}) · 서버 형식 검사: ${check.success ? '통과' : check.error.message}`);
  if (dry) {
    console.log(JSON.stringify(facts, null, 1).slice(0, 1500));
    continue;
  }
  const out = await generatePair(check.data!);
  for (const [k, v] of Object.entries(out)) console.log(`[${k}] ${restoreNames(v, x.name, y.name)}`);
}

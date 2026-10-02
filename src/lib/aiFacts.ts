import { REL_INFO, type FamilyRel, type PairAnalysis, type Personality } from './compatDetail';
import type { SajuChart } from './saju';

/**
 * AI 풀이에 보낼 사실. 이름은 A·B로 바꾸고 생년월일은 넣지 않는다(서버·AI에는 이름이 가지 않음).
 * 화면에 보여 줄 때 restoreNames로 다시 이름을 넣는다.
 */
export function buildPairFacts(
  base: { name: string; chart: SajuChart; trait: Personality },
  other: { name: string; chart: SajuChart; trait: Personality },
  rel: FamilyRel | null,
  a: PairAnalysis,
) {
  // 긴 이름부터 바꿔야 '엄마'가 '큰엄마' 안에서 먼저 바뀌는 일이 없다
  const pairs = [
    [base.name, 'A'],
    [other.name, 'B'],
  ].sort((x, y) => y[0].length - x[0].length);
  const anon = (text: string) => pairs.reduce((t, [name, tag]) => (name ? t.split(name).join(tag) : t), text);
  const person = (p: typeof base) => ({
    image: p.trait.image,
    stem: p.trait.stem,
    animal: `${p.chart.animal}띠`,
    keywords: p.trait.keywords.slice(0, 4),
    familyRole: p.trait.familyRole,
    summary: anon(p.trait.summary),
  });
  return {
    relation: rel ? REL_INFO[rel].label : null,
    score: a.score,
    grade: a.grade,
    points: a.points.map((p) => ({ label: anon(p.label), value: p.value })),
    a: person(base),
    b: person(other),
    styleText: anon(a.styleText),
    flowText: anon(a.flowText),
    roleTip: anon(a.roleTip),
    zodiac: { label: a.zodiac.label, text: anon(a.zodiac.text) },
    conflictText: anon(a.conflictText),
    activity: anon(a.activity),
    goodNumbers: a.goodNumbers,
    avoidNumbers: a.avoidNumbers,
    dateNumbers: a.dateNumbers,
    goodElements: a.goodElements,
    avoidElements: a.avoidElements,
    numberReason: anon(a.numberReason),
  };
}

/** AI가 쓴 "A님·B님"을 실제 이름으로 */
export const restoreNames = (text: string, baseName: string, otherName: string) => text.replace(/A\s?님/g, `${baseName} 님`).replace(/B\s?님/g, `${otherName} 님`);

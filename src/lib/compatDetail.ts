import { CONTROLS, ELEMENTS, ELEMENT_INFO, GENERATES, STEMS, controllerOf, numbersOf } from './elements';
import { hashString, seededRandom } from './random';
import type { SajuChart } from './saju';
import { relationOf } from './sajuDetail';
import type { Element } from './types';

/**
 * 가족 궁합 자세히 보기. 재미로 보는 풀이라 단정하지 않는다.
 * - 성향: 일간(태어난 날의 천간) 10가지 + 기운의 세기·넘치는 기운으로 정리
 * - 두 사람: 일간 오행 관계, 천간합, 띠(육합·삼합·충·원진), 서로 모자란 기운을 채워 주는지, (배우자면) 일지 합·충을 점수로 더한다
 * - 숫자: 둘에게 필요한 기운(통관·용신·모자란 기운)의 번호는 함께하면 좋은 숫자,
 *         그 기운을 누르거나 이미 넘치는 기운의 번호는 피하면 좋은 숫자로 고른다(두 사람이 같으면 늘 같은 결과)
 */

// ─── 관계 ─────────────────────────────────────────────

export type FamilyRel = 'mother' | 'father' | 'parent' | 'spouse' | 'child' | 'sibling' | 'grandparent' | 'grandchild' | 'friend' | 'other';

/** 관계를 크게 넷으로: 윗사람·아랫사람·배우자·대등한 사이 */
type Role = 'elder' | 'younger' | 'partner' | 'peer';

export const REL_INFO: Record<FamilyRel, { label: string; emoji: string; role: Role; inverse: FamilyRel }> = {
  mother: { label: '엄마', emoji: '👩', role: 'elder', inverse: 'child' },
  father: { label: '아빠', emoji: '👨', role: 'elder', inverse: 'child' },
  parent: { label: '부모님', emoji: '🧑', role: 'elder', inverse: 'child' },
  spouse: { label: '배우자·연인', emoji: '💑', role: 'partner', inverse: 'spouse' },
  child: { label: '자녀', emoji: '👶', role: 'younger', inverse: 'parent' },
  sibling: { label: '형제·자매', emoji: '👫', role: 'peer', inverse: 'sibling' },
  grandparent: { label: '할머니·할아버지', emoji: '👵', role: 'elder', inverse: 'grandchild' },
  grandchild: { label: '손주', emoji: '🧒', role: 'younger', inverse: 'grandparent' },
  friend: { label: '친구', emoji: '🙌', role: 'peer', inverse: 'friend' },
  other: { label: '그 밖의 사이', emoji: '🤝', role: 'peer', inverse: 'other' },
};

/** 고를 수 있는 관계(부모님은 자녀 쪽에서 거꾸로 볼 때만 쓰는 값이라 뺀다) */
export const REL_CHOICES: FamilyRel[] = ['mother', 'father', 'spouse', 'child', 'sibling', 'grandparent', 'grandchild', 'friend', 'other'];

// ─── 성향 ─────────────────────────────────────────────

interface StemTrait {
  image: string;
  emoji: string;
  keywords: [string, string, string];
  strength: string;
  caution: string;
}

const STEM_TRAITS: Record<string, StemTrait> = {
  甲: { image: '큰 나무', emoji: '🌳', keywords: ['곧음', '앞장섬', '책임감'], strength: '한번 정하면 꿋꿋하게 밀고 나가는 힘이 있어요.', caution: '고집이 세 보일 수 있으니 한 번쯤 물러서 주면 좋아요.' },
  乙: { image: '풀과 덩굴', emoji: '🌿', keywords: ['부드러움', '적응력', '끈기'], strength: '어떤 자리에서도 잘 어울리고 끝까지 버티는 끈기가 있어요.', caution: '속마음을 감추기 쉬우니 서운한 건 말로 꺼내 주세요.' },
  丙: { image: '태양', emoji: '☀️', keywords: ['밝음', '솔직함', '열정'], strength: '주변을 환하게 만들고 숨김없이 솔직해요.', caution: '마음이 앞서 서두르기 쉬우니 한 박자 쉬어 가요.' },
  丁: { image: '촛불', emoji: '🕯️', keywords: ['섬세함', '따뜻함', '집중'], strength: '가까운 사람을 세심하게 챙기고 한 가지에 깊이 몰두해요.', caution: '작은 말에도 마음이 쓰이니 스스로를 다독여 주세요.' },
  戊: { image: '큰 산', emoji: '⛰️', keywords: ['듬직함', '포용', '여유'], strength: '흔들리지 않고 사람들을 넉넉하게 품어 줘요.', caution: '느긋함이 무심함으로 보일 수 있으니 관심을 표현해 주세요.' },
  己: { image: '논밭', emoji: '🌾', keywords: ['꼼꼼함', '실속', '배려'], strength: '살림과 실속을 잘 챙기고 남을 먼저 배려해요.', caution: '걱정이 많아질 때는 혼자 끌어안지 말고 나눠 주세요.' },
  庚: { image: '바위와 쇠', emoji: '🪨', keywords: ['결단', '의리', '직설'], strength: '맺고 끊음이 분명하고 내 사람은 끝까지 지켜요.', caution: '말이 직설적이라 부드럽게 한 번 감싸 주면 좋아요.' },
  辛: { image: '보석', emoji: '💎', keywords: ['깔끔함', '안목', '자존심'], strength: '보는 눈이 높고 무엇이든 정갈하게 다듬어요.', caution: '자존심이 다치기 쉬우니 칭찬을 아끼지 마세요.' },
  壬: { image: '큰 강', emoji: '🌊', keywords: ['넓은 품', '자유로움', '지혜'], strength: '생각의 폭이 넓고 큰 그림을 잘 그려요.', caution: '얽매이기 싫어하니 서로의 시간을 존중해 주세요.' },
  癸: { image: '이슬비', emoji: '🌧️', keywords: ['조용함', '직관', '공감'], strength: '말없이 스며들어 상대의 마음을 잘 알아채요.', caution: '속으로 삭이는 편이라 먼저 물어봐 주면 좋아요.' },
};

/** 가족 안에서 맡기 쉬운 역할(일간 오행 기준) */
const FAMILY_ROLE: Record<Element, string> = {
  wood: '새 일을 먼저 시작하는 개척자',
  fire: '집안 분위기를 띄우는 분위기 메이커',
  earth: '가운데서 중심을 잡는 버팀목',
  metal: '정리하고 결정을 내리는 해결사',
  water: '이야기를 들어 주는 조언자',
};

export interface Personality {
  image: string;
  emoji: string;
  stem: string;
  keywords: string[];
  summary: string;
  caution: string;
  familyRole: string;
}

export function personalityOf(chart: SajuChart): Personality {
  const stem = chart.dayMaster.hanja;
  const t = STEM_TRAITS[stem];
  const power =
    chart.strength === 'strong' ? '자기 생각이 뚜렷해 스스로 길을 만드는 편이에요.' : chart.strength === 'weak' ? '사람들과 함께할 때 더 큰 힘이 나는 편이에요.' : '기운이 고르게 놓여 어디서나 균형을 잘 잡아요.';
  const over = chart.excessive[0];
  const overText = over ? ` ${ELEMENT_INFO[over].name} 기운이 넉넉해서 ${OVER_TEXT[over]}` : '';
  return {
    image: t.image,
    emoji: t.emoji,
    stem: `${STEMS[stem].ko}${ELEMENT_INFO[chart.dayMaster.element].ko}(${stem})`,
    keywords: [...t.keywords],
    summary: `${t.image}처럼 ${t.strength} ${power}${overText}`,
    caution: t.caution,
    familyRole: FAMILY_ROLE[chart.dayMaster.element],
  };
}

const OVER_TEXT: Record<Element, string> = {
  wood: '하고 싶은 일이 많아요.',
  fire: '표현이 풍부해요.',
  earth: '믿음직하지만 변화에는 신중해요.',
  metal: '원칙을 중요하게 여겨요.',
  water: '생각이 많고 깊어요.',
};

// ─── 두 사람 ───────────────────────────────────────────

/** 천간합: 서로 끌리는 일간 짝 */
const STEM_HAP = ['甲己', '乙庚', '丙辛', '丁壬', '戊癸'];
const SAMHAP = ['申子辰', '亥卯未', '寅午戌', '巳酉丑'];
const YUKHAP = ['子丑', '寅亥', '卯戌', '辰酉', '巳申', '午未'];
const CHUNG = ['子午', '丑未', '寅申', '卯酉', '辰戌', '巳亥'];
/** 원진: 괜히 서운해지기 쉬운 띠 짝 */
const WONJIN = ['子未', '丑午', '寅酉', '卯申', '辰亥', '巳戌'];

const pairIn = (list: string[], a: string, b: string) => a !== b && list.some((p) => p.includes(a) && p.includes(b));

/** 기운이 흐르는 방향: 기준 사람(a)이 상대(b)에게 */
type Flow = 'same' | 'give' | 'receive' | 'lead' | 'checked';

const FLOW_OF = { same: 'same', output: 'give', resource: 'receive', wealth: 'lead', power: 'checked' } as const;

const FLOW_TEXT: Record<Flow, (a: string, b: string) => string> = {
  same: (a, b) => `${a} 님과 ${b} 님은 같은 기운이라 말하지 않아도 마음이 통해요.`,
  give: (a, b) => `${a} 님의 기운이 ${b} 님에게 흘러가 힘을 보태 주는 사이예요.`,
  receive: (a, b) => `${b} 님의 기운이 ${a} 님에게 흘러와 힘을 채워 주는 사이예요.`,
  lead: (a, b) => `${a} 님이 ${b} 님을 이끌고 다잡아 주는 사이예요.`,
  checked: (a, b) => `${b} 님이 ${a} 님을 단단하게 잡아 주는 사이예요.`,
};

/** 관계(윗사람·아랫사람·배우자·대등) × 기운 흐름별 한마디 */
const ROLE_TIP: Record<Role, Record<Flow, string>> = {
  elder: {
    same: '닮은 점이 많아 편하지만 고집이 부딪칠 땐 먼저 한발 물러서 드리세요.',
    give: '받기만 하던 사랑을 돌려드리는 사이예요. 작은 안부 전화가 큰 힘이 돼요.',
    receive: '곁에만 있어도 든든한 버팀목이에요. 고민이 있으면 털어놓아 보세요.',
    lead: '어른을 챙기는 역할이 자연스러워요. 결정을 대신하기보다 의견을 여쭤 보세요.',
    checked: '잔소리처럼 들려도 나를 위한 말이 많아요. 한 번 더 귀 기울여 보세요.',
  },
  younger: {
    same: '친구처럼 잘 통해요. 가르치기보다 함께 해 보는 게 잘 맞아요.',
    give: '내가 주는 사랑을 쑥쑥 받아 자라는 사이예요. 칭찬을 아끼지 마세요.',
    receive: '오히려 아이 덕분에 웃고 힘이 나는 사이예요. 고맙다는 말을 전해 주세요.',
    lead: '이끌어 주는 힘이 커요. 너무 다잡기보다 스스로 해 볼 시간을 주세요.',
    checked: '아이의 고집에 내가 맞춰 주는 편이에요. 지칠 땐 규칙을 함께 정해 보세요.',
  },
  partner: {
    same: '생각이 닮아 손발이 잘 맞아요. 서로의 영역을 정해 두면 다툼이 줄어요.',
    give: '한 사람이 더 챙기는 사이예요. 챙김받는 쪽이 고마움을 꼭 표현해 주세요.',
    receive: '곁에 있으면 마음이 채워지는 사이예요. 받은 만큼 표현으로 돌려주세요.',
    lead: '한 사람이 방향을 잡고 한 사람이 따라가요. 큰일은 꼭 같이 정해요.',
    checked: '서로를 다듬어 주는 사이예요. 지적보다 칭찬을 먼저 건네 보세요.',
  },
  peer: {
    same: '말이 잘 통하는 단짝이에요. 경쟁보다 협력할 때 더 빛나요.',
    give: '내가 힘을 보태는 사이예요. 도움을 주고받는 균형을 챙겨 보세요.',
    receive: '나에게 힘이 되는 사람이에요. 고마움을 자주 표현해 주세요.',
    lead: '내가 앞장서는 편이에요. 상대의 속도도 기다려 주세요.',
    checked: '나를 일깨워 주는 사람이에요. 쓴소리도 약이 될 때가 많아요.',
  },
};

export interface PairAnalysis {
  score: number;
  grade: string;
  /** 점수에 들어간 항목(사람이 읽을 수 있게) */
  points: { label: string; value: number }[];
  flowText: string;
  roleTip: string;
  styleText: string;
  zodiac: { label: string; text: string };
  goodNumbers: number[];
  avoidNumbers: number[];
  goodElements: Element[];
  avoidElements: Element[];
  numberReason: string;
}

const elName = (e: Element) => `${ELEMENT_INFO[e].name}(${ELEMENT_INFO[e].hanja})`;

function zodiacOf(a: SajuChart, b: SajuChart) {
  const x = a.pillars.year.branch;
  const y = b.pillars.year.branch;
  const names = `${a.animal}띠와 ${b.animal}띠`;
  if (x === y) return { label: '같은 띠', text: `같은 ${a.animal}띠라 생각하는 방식이 닮았어요.`, value: 5 };
  if (pairIn(YUKHAP, x, y)) return { label: '육합 · 짝꿍 띠', text: `${names}는 서로 부족한 점을 채워 주는 짝꿍 띠예요.`, value: 15 };
  if (pairIn(SAMHAP, x, y)) return { label: '삼합 · 한 팀 띠', text: `${names}는 같은 방향을 보고 함께하기 좋은 한 팀 띠예요.`, value: 10 };
  if (pairIn(CHUNG, x, y)) return { label: '충 · 부딪치는 띠', text: `${names}는 성향이 정반대라 부딪치기 쉬워요. 그만큼 서로에게 없는 점을 배울 수 있어요.`, value: -12 };
  if (pairIn(WONJIN, x, y)) return { label: '원진 · 서운하기 쉬운 띠', text: `${names}는 사소한 일로 서운해지기 쉬워요. 오해가 생기면 바로 풀어 주세요.`, value: -8 };
  return { label: '무난한 띠', text: `${names}는 크게 부딪치지도 끌리지도 않는 무난한 사이예요.`, value: 0 };
}

/** a가 b를 누르면 그 사이를 이어 주는 기운(a가 낳고, 그 기운이 b를 낳는 기운) */
function bridgeOf(a: Element, b: Element): Element | null {
  if (CONTROLS[a] === b) return GENERATES[a];
  if (CONTROLS[b] === a) return GENERATES[b];
  return null;
}

function pickFrom(elements: Element[], count: number, rand: () => number, exclude: Set<number>) {
  const out: number[] = [];
  // 앞에 놓인 기운일수록 더 많이 뽑는다(가중치 3·2·1)
  const pool: number[] = [];
  elements.forEach((e, i) => {
    const weight = Math.max(1, 3 - i);
    for (const n of numbersOf(e)) if (!exclude.has(n)) for (let k = 0; k < weight; k++) pool.push(n);
  });
  while (out.length < count && pool.length) {
    const n = pool[Math.floor(rand() * pool.length)];
    if (!out.includes(n)) out.push(n);
    for (let i = pool.length - 1; i >= 0; i--) if (pool[i] === n) pool.splice(i, 1);
  }
  return out.sort((x, y) => x - y);
}

export function analyzePair(
  base: { id: string; name: string; chart: SajuChart },
  other: { id: string; name: string; chart: SajuChart },
  rel: FamilyRel | null,
): PairAnalysis {
  const a = base.chart;
  const b = other.chart;
  const points: { label: string; value: number }[] = [];

  // 1) 일간 오행 관계
  const r = relationOf(a.dayMaster.element, b.dayMaster.element);
  const flow = FLOW_OF[r];
  const flowValue = flow === 'give' || flow === 'receive' ? 14 : flow === 'same' ? 10 : 2;
  points.push({ label: flow === 'give' || flow === 'receive' ? '기운이 서로 살려 주는 사이' : flow === 'same' ? '같은 기운' : '기운이 서로 다잡는 사이', value: flowValue });

  // 2) 천간합
  if (pairIn(STEM_HAP, a.dayMaster.hanja, b.dayMaster.hanja)) points.push({ label: '일간이 합을 이루는 사이(천간합)', value: 14 });

  // 3) 띠
  const z = zodiacOf(a, b);
  if (z.value) points.push({ label: z.label, value: z.value });

  // 4) 서로 모자란 기운을 채워 주는지
  if (b.counts[a.usefulElement] >= 2) points.push({ label: `${other.name} 님이 ${base.name} 님에게 필요한 기운을 가졌어요`, value: 8 });
  if (a.counts[b.usefulElement] >= 2) points.push({ label: `${base.name} 님이 ${other.name} 님에게 필요한 기운을 가졌어요`, value: 8 });

  // 5) 배우자는 일지(태어난 날의 지지, 배우자 자리)의 합·충을 본다
  if (rel && REL_INFO[rel].role === 'partner') {
    const x = a.pillars.day.branch;
    const y = b.pillars.day.branch;
    if (pairIn(YUKHAP, x, y)) points.push({ label: '배우자 자리(일지)가 합', value: 10 });
    else if (pairIn(CHUNG, x, y)) points.push({ label: '배우자 자리(일지)가 충', value: -8 });
  }

  const raw = 50 + points.reduce((s, p) => s + p.value, 0);
  const score = Math.max(40, Math.min(98, raw));
  const grade = score >= 88 ? '찰떡궁합' : score >= 74 ? '잘 맞는 사이' : score >= 60 ? '편안한 사이' : '맞춰 갈수록 좋아지는 사이';

  // 성향 비교: 양(앞장서는 편)·음(챙기는 편)
  const ay = a.dayMaster.yang;
  const by = b.dayMaster.yang;
  const ta = STEM_TRAITS[a.dayMaster.hanja];
  const tb = STEM_TRAITS[b.dayMaster.hanja];
  const styleText =
    ay && by
      ? `${base.name} 님(${ta.image})과 ${other.name} 님(${tb.image}) 모두 앞장서는 편이에요. 역할을 나눠 맡으면 든든한 한 팀이 돼요.`
      : !ay && !by
        ? `${base.name} 님(${ta.image})과 ${other.name} 님(${tb.image}) 모두 조용히 챙기는 편이에요. 서로 먼저 마음을 표현해 주면 더 가까워져요.`
        : `${ay ? base.name : other.name} 님이 앞에서 이끌고 ${ay ? other.name : base.name} 님이 뒤에서 받쳐 주는 짝이에요. (${base.name}: ${ta.image}, ${other.name}: ${tb.image})`;

  // 숫자: 좋은 기운 = 통관 → 두 사람의 용신 → 둘이 합쳐 가장 모자란 기운
  const combined: Record<Element, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  for (const e of ELEMENTS) combined[e] = a.counts[e] + b.counts[e];
  const weakest = [...ELEMENTS].sort((x, y) => combined[x] - combined[y])[0];
  const strongest = [...ELEMENTS].sort((x, y) => combined[y] - combined[x])[0];
  const bridge = bridgeOf(a.dayMaster.element, b.dayMaster.element);
  const good: Element[] = [];
  for (const e of [bridge, a.usefulElement, b.usefulElement, weakest]) if (e && !good.includes(e)) good.push(e);
  const goodTop = good.slice(0, 3);
  // 피할 기운 = 가장 중요한 좋은 기운을 누르는 기운, 둘이 합쳐 이미 넘치는 기운(좋은 기운이 아니면)
  const avoid: Element[] = [];
  for (const e of [controllerOf(goodTop[0]), strongest]) if (!goodTop.includes(e) && !avoid.includes(e)) avoid.push(e);
  if (!avoid.length) avoid.push(ELEMENTS.find((e) => !goodTop.includes(e))!);

  const rand = seededRandom(hashString([base.id, other.id].sort().join('|') + '|pair'));
  const goodNumbers = pickFrom(goodTop, 6, rand, new Set());
  const avoidNumbers = pickFrom(avoid, 4, rand, new Set(goodNumbers));

  const why = bridge
    ? `두 사람 사이를 이어 주는 ${elName(bridge)} 기운`
    : `두 사람에게 필요한 ${goodTop.map(elName).join('·')} 기운`;
  const numberReason = `${why}의 숫자를 함께 쓰면 좋고, ${avoid.map(elName).join('·')} 기운은 ${avoid.includes(strongest) ? '이미 넉넉하거나 ' : ''}좋은 기운을 눌러서 피하는 게 좋아요.`;

  const roleTip = ROLE_TIP[rel ? REL_INFO[rel].role : 'peer'][flow];

  return {
    score,
    grade,
    points,
    flowText: FLOW_TEXT[flow](base.name, other.name),
    roleTip,
    styleText,
    zodiac: { label: z.label, text: z.text },
    goodNumbers,
    avoidNumbers,
    goodElements: goodTop,
    avoidElements: avoid,
    numberReason,
  };
}

/** 가족 전체: 다 함께 좋은 숫자와 피할 숫자 */
export function familyNumbers(members: { id: string; chart: SajuChart }[]) {
  const combined: Record<Element, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  for (const m of members) for (const e of ELEMENTS) combined[e] += m.chart.counts[e];
  const order = [...ELEMENTS].sort((x, y) => combined[x] - combined[y]);
  const good = order.slice(0, 2);
  const avoid: Element[] = [];
  for (const e of [order[order.length - 1], controllerOf(good[0])]) if (!good.includes(e) && !avoid.includes(e)) avoid.push(e);
  const rand = seededRandom(hashString(members.map((m) => m.id).sort().join('|') + '|family'));
  const goodNumbers = pickFrom(good, 6, rand, new Set());
  const avoidNumbers = pickFrom(avoid, 4, rand, new Set(goodNumbers));
  return { combined, good, avoid, goodNumbers, avoidNumbers };
}

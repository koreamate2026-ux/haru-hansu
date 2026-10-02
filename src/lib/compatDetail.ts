import { CONTROLS, ELEMENTS, ELEMENT_INFO, GENERATES, STEMS, controllerOf, motherOf, numberElement, numbersOf } from './elements';
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
  /** 같은 일간이 가족 안에 둘 이상이면 두 번째 사람은 다른 문장으로 */
  strength: [string, string];
  caution: string;
}

const STEM_TRAITS: Record<string, StemTrait> = {
  甲: { image: '큰 나무', emoji: '🌳', keywords: ['곧음', '앞장섬', '책임감'], strength: ['한번 정하면 꿋꿋하게 밀고 나가는 힘이 있어요.', '위로 쭉 뻗어 가듯 목표를 세우면 흔들리지 않아요.'], caution: '고집이 세 보일 수 있으니 한 번쯤 물러서 주면 좋아요.' },
  乙: { image: '풀과 덩굴', emoji: '🌿', keywords: ['부드러움', '적응력', '끈기'], strength: ['어떤 자리에서도 잘 어울리고 끝까지 버티는 끈기가 있어요.', '바람에 휘어도 꺾이지 않듯 유연하게 길을 찾아요.'], caution: '속마음을 감추기 쉬우니 서운한 건 말로 꺼내 주세요.' },
  丙: { image: '태양', emoji: '☀️', keywords: ['밝음', '솔직함', '열정'], strength: ['주변을 환하게 만들고 숨김없이 솔직해요.', '어디서든 먼저 웃고 먼저 다가가는 따뜻함이 있어요.'], caution: '마음이 앞서 서두르기 쉬우니 한 박자 쉬어 가요.' },
  丁: { image: '촛불', emoji: '🕯️', keywords: ['섬세함', '따뜻함', '집중'], strength: ['가까운 사람을 세심하게 챙기고 한 가지에 깊이 몰두해요.', '작은 불빛처럼 곁에 있는 사람을 은은하게 비춰 줘요.'], caution: '작은 말에도 마음이 쓰이니 스스로를 다독여 주세요.' },
  戊: { image: '큰 산', emoji: '⛰️', keywords: ['듬직함', '포용', '여유'], strength: ['흔들리지 않고 사람들을 넉넉하게 품어 줘요.', '한자리를 묵묵히 지키며 기댈 언덕이 돼 줘요.'], caution: '느긋함이 무심함으로 보일 수 있으니 관심을 표현해 주세요.' },
  己: { image: '논밭', emoji: '🌾', keywords: ['꼼꼼함', '실속', '배려'], strength: ['살림과 실속을 잘 챙기고 남을 먼저 배려해요.', '씨앗을 키우듯 사람과 일을 차근차근 길러 내요.'], caution: '걱정이 많아질 때는 혼자 끌어안지 말고 나눠 주세요.' },
  庚: { image: '바위와 쇠', emoji: '🪨', keywords: ['결단', '의리', '직설'], strength: ['맺고 끊음이 분명하고 내 사람은 끝까지 지켜요.', '어려운 일 앞에서 오히려 단단해지는 사람이에요.'], caution: '말이 직설적이라 부드럽게 한 번 감싸 주면 좋아요.' },
  辛: { image: '보석', emoji: '💎', keywords: ['깔끔함', '안목', '자존심'], strength: ['보는 눈이 높고 무엇이든 정갈하게 다듬어요.', '갈고닦을수록 빛나는 보석처럼 꾸준히 자신을 가꿔요.'], caution: '자존심이 다치기 쉬우니 칭찬을 아끼지 마세요.' },
  壬: { image: '큰 강', emoji: '🌊', keywords: ['넓은 품', '자유로움', '지혜'], strength: ['생각의 폭이 넓고 큰 그림을 잘 그려요.', '막히면 돌아가는 강물처럼 어떤 상황에서도 길을 찾아요.'], caution: '얽매이기 싫어하니 서로의 시간을 존중해 주세요.' },
  癸: { image: '이슬비', emoji: '🌧️', keywords: ['조용함', '직관', '공감'], strength: ['말없이 스며들어 상대의 마음을 잘 알아채요.', '조용히 내리는 비처럼 곁에서 꾸준히 힘이 돼 줘요.'], caution: '속으로 삭이는 편이라 먼저 물어봐 주면 좋아요.' },
};

/** 나를 뺀 나머지 기운 중 가장 많은 무리(십성)로 보는 성향 */
type Group = 'same' | 'output' | 'wealth' | 'power' | 'resource';

const GROUP_TRAIT: Record<Group, { keywords: [string, string]; text: string; caution: string; role: string; lackTip: string }> = {
  same: { keywords: ['주관', '독립심'], text: '내 뜻대로 해 보고 싶은 마음이 커서 스스로 결정하는 걸 좋아해요.', caution: '혼자 다 짊어지려 하지 말고 도움을 청해도 괜찮아요.', role: '앞장서 끌고 가는 리더', lackTip: '가끔은 내 생각을 분명하게 말해 보세요.' },
  output: { keywords: ['표현력', '재주'], text: '생각을 말과 손으로 풀어내는 재주가 있어 주변을 즐겁게 해요.', caution: '말이 앞설 때는 한 번 더 들어 주면 좋아요.', role: '분위기를 띄우는 분위기 메이커', lackTip: '마음을 말로 표현하는 연습이 관계를 부드럽게 해요.' },
  wealth: { keywords: ['현실 감각', '살림꾼'], text: '실속을 잘 따지고 생활을 알뜰하게 꾸려요.', caution: '계산이 앞서 보이지 않게 마음도 함께 표현해 주세요.', role: '살림과 계획을 챙기는 살림꾼', lackTip: '작은 계획부터 함께 세워 보면 좋아요.' },
  power: { keywords: ['원칙', '믿음직함'], text: '약속과 규칙을 잘 지켜서 믿고 맡기기 좋은 사람이에요.', caution: '스스로에게 너무 엄격하지 않게 쉬는 시간도 챙기세요.', role: '약속을 지키는 든든한 기둥', lackTip: '생활의 작은 규칙을 정해 두면 마음이 편해요.' },
  resource: { keywords: ['배움', '깊은 생각'], text: '배우고 생각하기를 좋아해서 조언을 잘 해 줘요.', caution: '생각이 길어질 땐 일단 해 보는 것도 좋아요.', role: '이야기를 들어 주는 조언자', lackTip: '모르는 건 가족에게 물어보면 오히려 가까워져요.' },
};

/** 태어난 계절(월지) */
type Season = 'spring' | 'summer' | 'autumn' | 'winter';
const SEASON_OF: Record<string, Season> = { 寅: 'spring', 卯: 'spring', 辰: 'spring', 巳: 'summer', 午: 'summer', 未: 'summer', 申: 'autumn', 酉: 'autumn', 戌: 'autumn', 亥: 'winter', 子: 'winter', 丑: 'winter' };
const SEASON_TRAIT: Record<Season, { keyword: string; text: string; role: string }> = {
  spring: { keyword: '시작하는 힘', text: '봄에 태어나 새로운 일을 시작하는 데 망설임이 적어요.', role: '새 일을 먼저 시작하는 개척자' },
  summer: { keyword: '활기', text: '여름에 태어나 에너지가 밝고 사람들 사이에서 활기를 줘요.', role: '웃음을 주는 에너자이저' },
  autumn: { keyword: '마무리', text: '가을에 태어나 일을 정리하고 끝맺는 힘이 좋아요.', role: '정리하고 결정하는 해결사' },
  winter: { keyword: '속 깊음', text: '겨울에 태어나 겉보다 속이 깊고 생각을 오래 품어요.', role: '마음을 읽어 주는 공감 담당' },
};

/** 일지(배우자·가까운 사람 자리)의 기운이 나에게 어떤지 */
const DAY_BRANCH_TEXT: Record<Group, string> = {
  same: '가까운 사람과는 친구처럼 대등하게 지내는 걸 좋아해요.',
  output: '가까운 사람에게는 아낌없이 챙겨 주는 편이에요.',
  wealth: '가까운 사람과 함께 무언가를 이뤄 가는 데서 기쁨을 느껴요.',
  power: '가까운 사람에게는 책임감을 크게 느끼는 편이에요.',
  resource: '가까운 사람에게 기대고 위로받을 때 힘이 나요.',
};

const ELEMENT_ROLE: Record<Element, string> = {
  wood: '함께 성장하자고 북돋는 응원단장',
  fire: '집안을 밝히는 햇살',
  earth: '가운데서 중심을 잡는 버팀목',
  metal: '원칙을 지키는 정리 담당',
  water: '부드럽게 흐름을 잇는 연결고리',
};

export interface Personality {
  image: string;
  emoji: string;
  stem: string;
  keywords: string[];
  summary: string;
  caution: string;
  familyRole: string;
  /** 부족한 쪽을 채우는 한마디 */
  growTip: string;
}

function groupCounts(chart: SajuChart): Record<Group, number> {
  const self = chart.dayMaster.element;
  const c = chart.counts;
  return {
    same: Math.max(0, c[self] - 1),
    output: c[GENERATES[self]],
    wealth: c[CONTROLS[self]],
    power: c[controllerOf(self)],
    resource: c[motherOf(self)],
  };
}

interface TraitParts {
  t: StemTrait;
  dominant: Group;
  weakest: Group;
  season: Season;
  dayGroup: Group;
}

function partsOf(chart: SajuChart): TraitParts {
  const g = groupCounts(chart);
  const groups = Object.keys(g) as Group[];
  const dominant = groups.reduce((a, b) => (g[b] > g[a] ? b : a));
  const weakest = groups.reduce((a, b) => (g[b] < g[a] ? b : a));
  const dayGroup = relationOf(chart.dayMaster.element, chart.pillars.day.branchElement) as Group;
  return { t: STEM_TRAITS[chart.dayMaster.hanja], dominant, weakest, season: SEASON_OF[chart.pillars.month.branch], dayGroup };
}

function build(chart: SajuChart, parts: TraitParts, variant: number, keywords: string[], familyRole: string): Personality {
  const { t, dominant, weakest, season, dayGroup } = parts;
  const power = chart.strength === 'strong' ? '스스로 길을 만드는 힘이 강한 편이에요.' : chart.strength === 'weak' ? '사람들과 함께할 때 더 큰 힘이 나요.' : '';
  const sentences = [`${t.image}처럼 ${t.strength[variant % 2]}`, GROUP_TRAIT[dominant].text, SEASON_TRAIT[season].text, DAY_BRANCH_TEXT[dayGroup], power].filter(Boolean);
  return {
    image: t.image,
    emoji: t.emoji,
    stem: `${STEMS[chart.dayMaster.hanja].ko}${ELEMENT_INFO[chart.dayMaster.element].ko}(${chart.dayMaster.hanja})`,
    keywords,
    summary: sentences.join(' '),
    caution: variant % 2 ? GROUP_TRAIT[dominant].caution : t.caution,
    familyRole,
    growTip: weakest !== dominant ? GROUP_TRAIT[weakest].lackTip : '',
  };
}

/** 한 사람만 볼 때 */
export function personalityOf(chart: SajuChart): Personality {
  const parts = partsOf(chart);
  const kw = [parts.t.keywords[0], GROUP_TRAIT[parts.dominant].keywords[0], SEASON_TRAIT[parts.season].keyword];
  return build(chart, parts, 0, kw, GROUP_TRAIT[parts.dominant].role);
}

/**
 * 가족 모두를 한꺼번에: 같은 일간이어도 문장·키워드·역할이 겹치지 않게 고른다.
 * 키워드는 일간·많은 기운·계절·일지에서 후보를 모아 앞사람이 쓴 건 피하고, 역할도 한 사람씩 다르게 나눈다.
 */
export function familyPersonalities(members: { id: string; chart: SajuChart }[]): Record<string, Personality> {
  const usedKw = new Set<string>();
  const usedRole = new Set<string>();
  const stemSeen: Record<string, number> = {};
  const out: Record<string, Personality> = {};
  for (const m of members) {
    const parts = partsOf(m.chart);
    const variant = stemSeen[m.chart.dayMaster.hanja] ?? 0;
    stemSeen[m.chart.dayMaster.hanja] = variant + 1;

    const g = GROUP_TRAIT[parts.dominant];
    const pool = [
      parts.t.keywords[variant % 3],
      g.keywords[0],
      SEASON_TRAIT[parts.season].keyword,
      parts.t.keywords[(variant + 1) % 3],
      g.keywords[1],
      GROUP_TRAIT[parts.dayGroup].keywords[1],
      parts.t.keywords[(variant + 2) % 3],
    ];
    const kw: string[] = [];
    for (const k of pool) if (kw.length < 3 && !kw.includes(k) && !usedKw.has(k)) kw.push(k);
    for (const k of pool) if (kw.length < 3 && !kw.includes(k)) kw.push(k);
    kw.forEach((k) => usedKw.add(k));

    const roles = [g.role, SEASON_TRAIT[parts.season].role, ELEMENT_ROLE[m.chart.dayMaster.element], GROUP_TRAIT[parts.dayGroup].role];
    const role = roles.find((r) => !usedRole.has(r)) ?? roles[0];
    usedRole.add(role);

    out[m.id] = build(m.chart, parts, variant, kw, role);
  }
  return out;
}

// ─── 두 사람 ───────────────────────────────────────────

/** 천간합: 서로 끌리는 일간 짝 */
const STEM_HAP = ['甲己', '乙庚', '丙辛', '丁壬', '戊癸'];
const SAMHAP = ['申子辰', '亥卯未', '寅午戌', '巳酉丑'];
const YUKHAP = ['子丑', '寅亥', '卯戌', '辰酉', '巳申', '午未'];
const CHUNG = ['子午', '丑未', '寅申', '卯酉', '辰戌', '巳亥'];
/** 원진: 괜히 서운해지기 쉬운 띠 짝 */
const WONJIN = ['子未', '丑午', '寅酉', '卯申', '辰亥', '巳戌'];

const pairIn = (list: string[], a: string, b: string) => a !== b && list.some((p) => p.includes(a) && p.includes(b));
/** 형: 서로 다그치기 쉬운 짝(자기 자신끼리 형인 辰午酉亥 포함) */
const HYUNG = ['寅巳', '巳申', '寅申', '丑戌', '戌未', '丑未', '子卯'];
const SELF_HYUNG = ['辰', '午', '酉', '亥'];
const isHyung = (a: string, b: string) => (a === b ? SELF_HYUNG.includes(a) : pairIn(HYUNG, a, b));
/** 해: 사소한 일로 마음이 상하기 쉬운 짝 */
const HAE = ['子未', '丑午', '寅巳', '卯辰', '申亥', '酉戌'];

/** 다섯 기운이 얼마나 고르게 놓였는지(작을수록 고름) */
function unevenness(c: Record<Element, number>) {
  const vals = ELEMENTS.map((e) => c[e]);
  const mean = vals.reduce((x, y) => x + y, 0) / 5;
  return Math.sqrt(vals.reduce((s2, v) => s2 + (v - mean) ** 2, 0) / 5) / (mean || 1);
}

/** 함께하면 좋은 활동(둘에게 필요한 기운 × 사이) */
const ACTIVITY: Record<Element, Record<Role, string>> = {
  wood: { elder: '함께 동네 산책을 하며 옛이야기를 들어 보세요.', younger: '화분이나 작은 텃밭을 같이 키워 보세요.', partner: '숲길이나 공원을 걸으며 앞으로의 계획을 이야기해 보세요.', peer: '새로운 취미를 같이 시작해 보세요.' },
  fire: { elder: '사진을 함께 찍거나 옛날 앨범을 같이 넘겨 보세요.', younger: '같이 노래하거나 춤추며 크게 웃어 보세요.', partner: '공연이나 영화를 보고 맛있는 저녁을 먹어 보세요.', peer: '함께 웃을 수 있는 모임이나 여행을 계획해 보세요.' },
  earth: { elder: '좋아하시는 음식을 같이 만들어 드셔 보세요.', younger: '집안일 하나를 함께 맡아 끝내 보세요.', partner: '집밥을 같이 해 먹고 집을 함께 정리해 보세요.', peer: '맛집에 가서 천천히 밥 한 끼 해 보세요.' },
  metal: { elder: '가벼운 운동이나 건강 검진을 함께 챙겨 보세요.', younger: '자전거나 운동을 같이 배우며 약속을 지켜 보세요.', partner: '다음 달 계획과 가계부를 같이 정리해 보세요.', peer: '함께 운동하며 목표를 하나 정해 보세요.' },
  water: { elder: '전화나 차 한잔으로 안부를 자주 나눠 보세요.', younger: '자기 전에 오늘 있었던 일을 서로 이야기해 보세요.', partner: '물가나 온천에 가서 천천히 이야기를 나눠 보세요.', peer: '조용한 카페에서 속 이야기를 나눠 보세요.' },
};

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

/** 숫자 하나에 붙는 이야기 */
export interface NumberStory {
  /** 같은 이유로 묶인 숫자들 */
  numbers: number[];
  kind: 'good' | 'avoid' | 'date';
  element: Element;
  text: string;
}

/** 같은 기운의 숫자를 한 이야기로 묶는다. 생일과 닿는 숫자는 따로 한마디 붙인다 */
function groupStories(
  kind: 'good' | 'avoid',
  numbers: number[],
  why: (e: Element) => string,
  people: { name: string; chart: SajuChart }[],
): NumberStory[] {
  const order: Element[] = [];
  for (const n of numbers) if (!order.includes(numberElement(n))) order.push(numberElement(n));
  return order.map((e) => {
    const nums = numbers.filter((n) => numberElement(n) === e);
    const notes = nums.map((n) => (birthdayNote(n, people) ? `${n}은(는)${birthdayNote(n, people)}` : '')).filter(Boolean);
    return { numbers: nums, kind, element: e, text: `${why(e)}${notes.length ? ' ' + notes.join(' ') : ''}` };
  });
}

/** 오행이 관계에서 뜻하는 것 */
const ELEMENT_MEANING: Record<Element, string> = {
  wood: '함께 새 일을 시작하는 힘',
  fire: '마음을 표현하고 웃게 하는 힘',
  earth: '서로 믿고 기대는 안정',
  metal: '맺고 끊어 정리하는 결단',
  water: '대화로 이해하는 부드러움',
};

const birthMD = (c: SajuChart) => {
  const [, m, d] = c.solarDate.split('-').map(Number);
  return { m, d };
};

/** 생일과 닿는 숫자면 한마디 덧붙인다 */
function birthdayNote(n: number, people: { name: string; chart: SajuChart }[]): string {
  const hits: string[] = [];
  for (const p of people) {
    const { m, d } = birthMD(p.chart);
    if (n === d) hits.push(`${p.name} 님 생일(${m}월 ${d}일)의 날짜`);
    else if (n === m) hits.push(`${p.name} 님이 태어난 ${m}월`);
  }
  return hits.length ? ` ${hits.join(', ')} 숫자이기도 해요.` : '';
}

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
  /** 부딪치기 쉬운 순간과 풀어 가는 방법 */
  conflictText: string;
  /** 함께하면 좋은 활동 */
  activity: string;
  /** 숫자마다 왜 좋고 왜 피하는지 */
  stories: NumberStory[];
  /** 두 사람의 생일로 만든 숫자 */
  dateNumbers: number[];
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
  base: { id: string; name: string; chart: SajuChart; gender?: 'M' | 'F' | null },
  other: { id: string; name: string; chart: SajuChart; gender?: 'M' | 'F' | null },
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

  // 5) 일지(태어난 날의 지지): 가까운 사이의 생활 궁합. 배우자는 배우자 자리라 더 크게 본다
  const role = rel ? REL_INFO[rel].role : null;
  const partner = role === 'partner';
  {
    const x = a.pillars.day.branch;
    const y = b.pillars.day.branch;
    const w = partner ? 1 : 0.6;
    const where = partner ? '배우자 자리(일지)' : '생활 자리(일지)';
    if (pairIn(YUKHAP, x, y)) points.push({ label: `${where}가 합 · 함께 지내기 편해요`, value: Math.round(10 * w) });
    else if (pairIn(CHUNG, x, y)) points.push({ label: `${where}가 충 · 생활 방식이 달라요`, value: -Math.round(8 * w) });
    else if (isHyung(x, y)) points.push({ label: `${where}가 형 · 서로 다그치기 쉬워요`, value: -Math.round(6 * w) });
    else if (pairIn(HAE, x, y)) points.push({ label: `${where}가 해 · 작은 일에 서운하기 쉬워요`, value: -Math.round(5 * w) });
  }

  // 6) 전통 궁합의 배우자 기운: 남자에게는 내가 거두는 기운(재성), 여자에게는 나를 다듬는 기운(관성)
  if (partner && base.gender) {
    const want = base.gender === 'M' ? 'wealth' : 'power';
    if (r === want) points.push({ label: '서로를 배우자 기운으로 가진 사이', value: 8 });
  }

  // 7) 윗사람·아랫사람: 윗사람의 기운이 아랫사람을 길러 주면(생해 주면) 자연스러운 보살핌
  if ((role === 'elder' && r === 'resource') || (role === 'younger' && r === 'output')) {
    points.push({ label: '윗사람의 기운이 아랫사람을 길러 주는 사이', value: 6 });
  } else if ((role === 'elder' && r === 'wealth') || (role === 'younger' && r === 'power')) {
    points.push({ label: '아랫사람 기운이 윗사람을 누르는 모양 · 존중이 필요해요', value: -4 });
  }

  // 8) 조후(계절의 온도): 추운 계절과 더운 계절에 태어난 둘은 서로 온도를 맞춰 준다
  const sa = SEASON_OF[a.pillars.month.branch];
  const sb = SEASON_OF[b.pillars.month.branch];
  if ((sa === 'winter' && sb === 'summer') || (sa === 'summer' && sb === 'winter')) points.push({ label: '겨울생과 여름생 · 서로 온도를 맞춰 줘요', value: 6 });
  else if (sa === sb && (sa === 'winter' || sa === 'summer')) points.push({ label: `둘 다 ${sa === 'winter' ? '겨울' : '여름'}생 · 같은 쪽으로 쏠리기 쉬워요`, value: -2 });

  // 9) 함께하면 기운이 더 고르게 되는지
  const both: Record<Element, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  for (const e of ELEMENTS) both[e] = a.counts[e] + b.counts[e];
  if (unevenness(both) < Math.min(unevenness(a.counts), unevenness(b.counts)) - 0.1) points.push({ label: '함께 있으면 다섯 기운이 더 고르게 돼요', value: 6 });

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

  // 숫자 이야기: 그 숫자의 기운이 두 사람 사이에서 어떤 역할을 하는지
  const people = [
    { name: base.name, chart: a },
    { name: other.name, chart: b },
  ];
  const goodWhy = (e: Element) => {
    if (e === bridge) return `두 사람 사이를 이어 주는 ${elName(e)} 기운 숫자예요. 의견이 부딪칠 때 사이에서 완충이 돼 줘요.`;
    if (e === a.usefulElement && e === b.usefulElement) return `두 사람 모두에게 필요한 ${elName(e)} 기운 숫자예요.`;
    if (e === a.usefulElement) return `${base.name} 님에게 필요한 ${elName(e)} 기운 숫자라, ${base.name} 님 쪽 힘을 채워 줘요.`;
    if (e === b.usefulElement) return `${other.name} 님에게 필요한 ${elName(e)} 기운 숫자라, ${other.name} 님 쪽 힘을 채워 줘요.`;
    return `둘을 합쳐 가장 모자란 ${elName(e)} 기운을 채워 주는 숫자예요.`;
  };
  const avoidWhy = (e: Element) =>
    e === strongest
      ? `둘을 합쳐 이미 넉넉한 ${elName(e)} 기운 숫자예요. 더하면 한쪽으로 쏠리기 쉬워요.`
      : `두 사람에게 가장 필요한 ${elName(goodTop[0])} 기운을 누르는 ${elName(e)} 기운 숫자예요.`;
  const stories: NumberStory[] = [
    ...groupStories('good', goodNumbers, (e) => `${goodWhy(e)} ${ELEMENT_INFO[e].name} 기운은 ${ELEMENT_MEANING[e]}을 뜻해요.`, people),
    ...groupStories('avoid', avoidNumbers, avoidWhy, people),
  ];

  // 두 사람을 잇는 날짜 숫자: 각자의 생일 날짜와 둘을 더한 수(45를 넘으면 45로 나눈 나머지)
  const da = birthMD(a).d;
  const db = birthMD(b).d;
  const sum = ((da + db - 1) % 45) + 1;
  const dateNumbers = [...new Set([da, db, sum])];
  for (const n of dateNumbers) {
    const e = numberElement(n);
    const text =
      n === sum && n !== da && n !== db
        ? `${base.name} 님 생일 날짜(${da})와 ${other.name} 님 생일 날짜(${db})를 더한${da + db > 45 ? `(합 ${da + db}) 뒤 1~45 안으로 줄인` : ''} 숫자예요. 두 사람이 함께 만드는 숫자라 둘이 같이 고를 때 잘 어울려요.`
        : `${n === da ? base.name : other.name} 님 생일 날짜 숫자예요.`;
    const tone = goodTop.includes(e) ? ' 마침 두 사람에게 좋은 기운이라 더 반가운 숫자예요.' : avoid.includes(e) ? ' 다만 피하면 좋은 기운이라 하나만 넣는 걸 추천해요.' : '';
    stories.push({ numbers: [n], kind: 'date', element: e, text: `${text} ${elName(e)} 기운이에요.${tone}` });
  }

  const yb = [a.pillars.year.branch, b.pillars.year.branch];
  const db2 = [a.pillars.day.branch, b.pillars.day.branch];
  const conflictText = pairIn(CHUNG, db2[0], db2[1]) || pairIn(CHUNG, yb[0], yb[1])
    ? '생활 리듬이나 우선순위가 정반대일 때 부딪치기 쉬워요. 각자의 방식을 인정하는 규칙을 하나 정해 두세요.'
    : isHyung(db2[0], db2[1])
      ? '걱정하는 마음이 잔소리로 들릴 때가 있어요. 조언보다 "괜찮아?" 한마디가 먼저예요.'
      : pairIn(WONJIN, yb[0], yb[1]) || pairIn(HAE, db2[0], db2[1])
        ? '작은 말 한마디에 서운해지기 쉬워요. 오해는 그날 바로 풀어 주세요.'
        : flow === 'checked' || flow === 'lead'
          ? '한 사람이 결정을 도맡으면 다른 사람이 답답해질 수 있어요. 중요한 일은 같이 정해요.'
          : flow === 'same'
            ? '닮은 만큼 둘 다 고집을 부릴 때가 있어요. 번갈아 양보하는 순서를 정해 보세요.'
            : '크게 부딪칠 일은 적은 사이예요. 고마움을 말로 자주 전하면 더 좋아져요.';

  return {
    score,
    grade,
    points,
    conflictText,
    // 사이마다 다르게: 이어 주는 기운이 있으면 그것, 없으면 두 사람에 따라 좋은 기운 중 하나
    activity: ACTIVITY[bridge ?? goodTop[hashString([base.id, other.id].sort().join('|') + '|act') % goodTop.length]][role ?? 'peer'],
    flowText: FLOW_TEXT[flow](base.name, other.name),
    roleTip,
    styleText,
    zodiac: { label: z.label, text: z.text },
    goodNumbers,
    avoidNumbers,
    goodElements: goodTop,
    avoidElements: avoid,
    numberReason,
    stories,
    dateNumbers,
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
  const stories: NumberStory[] = [
    ...groupStories(
      'good',
      goodNumbers,
      (e) => `가족 모두를 합쳐 ${e === good[0] ? '가장' : '두 번째로'} 모자란 ${elName(e)} 기운 숫자예요. ${ELEMENT_INFO[e].name} 기운은 ${ELEMENT_MEANING[e]}을 뜻해서, 가족 사이에 그 힘을 더해 줘요.`,
      [],
    ),
    ...groupStories(
      'avoid',
      avoidNumbers,
      (e) => (e === order[order.length - 1] ? `가족이 이미 넉넉하게 가진 ${elName(e)} 기운 숫자예요.` : `가족에게 가장 필요한 ${elName(good[0])} 기운을 누르는 ${elName(e)} 기운 숫자예요.`),
      [],
    ),
  ];
  return { combined, good, avoid, goodNumbers, avoidNumbers, stories };
}

// ─── 가족 관계 한눈에 ────────────────────────────────────

export interface FamilyMember {
  id: string;
  name: string;
  chart: SajuChart;
  gender?: 'M' | 'F' | null;
}

export interface FamilyDynamics {
  /** 가족 모든 짝의 궁합 평균 */
  harmony: number;
  harmonyText: string;
  /** 가족을 가장 잘 이어 주는 사람 */
  connector: { name: string; avg: number } | null;
  /** 사람마다 가장 힘이 되는 상대 */
  bestFor: { name: string; partner: string; score: number }[];
  /** 마음을 더 써야 할 짝 */
  careful: { a: string; b: string; score: number; text: string }[];
  /** 띠(또는 일지)가 삼합을 이루는 세 사람 */
  trios: string[];
}

export function familyDynamics(members: FamilyMember[], relOf: (baseId: string, otherId: string) => FamilyRel | null): FamilyDynamics | null {
  if (members.length < 2) return null;
  const score: Record<string, number> = {};
  const key = (x: string, y: string) => [x, y].sort().join('|');
  const pairs: { a: FamilyMember; b: FamilyMember; s: number; conflict: string }[] = [];
  for (let i = 0; i < members.length; i++)
    for (let j = i + 1; j < members.length; j++) {
      const a = members[i];
      const b = members[j];
      const res = analyzePair(a, b, relOf(a.id, b.id));
      score[key(a.id, b.id)] = res.score;
      pairs.push({ a, b, s: res.score, conflict: res.conflictText });
    }

  const harmony = Math.round(pairs.reduce((s, p) => s + p.s, 0) / pairs.length);
  const harmonyText =
    harmony >= 85 ? '서로 힘이 되어 주는 화목한 가족이에요.' : harmony >= 72 ? '대체로 손발이 잘 맞는 가족이에요.' : harmony >= 60 ? '편안하지만 표현이 조금 더 필요한 가족이에요.' : '서로 다른 점이 많아 배울 것도 많은 가족이에요.';

  const avgOf = (m: FamilyMember) => {
    const others = members.filter((o) => o.id !== m.id);
    return others.reduce((s, o) => s + score[key(m.id, o.id)], 0) / others.length;
  };
  const connector = members.length >= 3 ? members.map((m) => ({ name: m.name, avg: Math.round(avgOf(m)) })).sort((x, y) => y.avg - x.avg)[0] : null;

  const bestFor = members.map((m) => {
    const best = members.filter((o) => o.id !== m.id).sort((x, y) => score[key(m.id, y.id)] - score[key(m.id, x.id)])[0];
    return { name: m.name, partner: best.name, score: score[key(m.id, best.id)] };
  });

  const careful = pairs
    .filter((p) => p.s < 66)
    .sort((x, y) => x.s - y.s)
    .slice(0, 2)
    .map((p) => ({ a: p.a.name, b: p.b.name, score: p.s, text: p.conflict }));

  const trios: string[] = [];
  if (members.length >= 3) {
    for (const group of SAMHAP) {
      for (const which of ['year', 'day'] as const) {
        const hit = group.split('').map((br) => members.find((m) => m.chart.pillars[which].branch === br));
        if (hit.every(Boolean)) {
          const names = hit.map((m) => m!.name).join('·');
          trios.push(which === 'year' ? `${names} 님은 띠가 삼합을 이루는 한 팀이에요. 셋이 함께하면 일이 술술 풀려요.` : `${names} 님은 생활 자리(일지)가 삼합이라 한집에서 지내기 잘 맞아요.`);
        }
      }
    }
  }

  return { harmony, harmonyText, connector, bestFor, careful, trios };
}

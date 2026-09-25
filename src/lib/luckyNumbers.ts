import { ELEMENT_INFO, ELEMENTS, numberElement, numbersOf } from './elements';
import { hashString, seededRandom } from './random';
import { computeChart, type SajuChart } from './saju';
import type { Element, FamilyEvent, Profile } from './types';

/** 12지지 순서 (子=0 쥐 ... 亥=11 돼지). 사주의 연지 글자를 이 순서로 찾아 띠 계산에 써요 */
const BRANCH_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

const SIGNS = [
  { name: '물병자리', from: 120, to: 218, planet: '천왕성', n: 4 },
  { name: '물고기자리', from: 219, to: 320, planet: '해왕성', n: 7 },
  { name: '양자리', from: 321, to: 419, planet: '화성', n: 9 },
  { name: '황소자리', from: 420, to: 520, planet: '금성', n: 6 },
  { name: '쌍둥이자리', from: 521, to: 621, planet: '수성', n: 5 },
  { name: '게자리', from: 622, to: 722, planet: '달', n: 2 },
  { name: '사자자리', from: 723, to: 822, planet: '태양', n: 1 },
  { name: '처녀자리', from: 823, to: 922, planet: '수성', n: 5 },
  { name: '천칭자리', from: 923, to: 1022, planet: '금성', n: 6 },
  { name: '전갈자리', from: 1023, to: 1122, planet: '화성', n: 9 },
  { name: '사수자리', from: 1123, to: 1224, planet: '목성', n: 3 },
] as const;
const CAPRICORN = { name: '염소자리', planet: '토성', n: 8 } as const;

export const BLOOD_TYPES = ['A', 'B', 'O', 'AB'] as const;
export type BloodType = (typeof BLOOD_TYPES)[number];
const BLOOD: Record<BloodType, { n: number; text: string }> = {
  A: { n: 1, text: '꼼꼼하고 성실한 A형은 첫째를 뜻하는 1이 기본 수예요.' },
  B: { n: 2, text: '자유롭고 힘이 넘치는 B형은 두 배의 기운 2가 기본 수예요.' },
  O: { n: 6, text: 'O는 알파벳 15번째 글자라 1과 5를 더한 6이 기본 수예요. 너그럽게 모두를 품는 수예요.' },
  AB: { n: 3, text: 'A(1)와 B(2)가 만난 AB형은 조화를 뜻하는 3이 기본 수예요.' },
};

const STONES = ['가넷', '자수정', '아쿠아마린', '다이아몬드', '에메랄드', '진주', '루비', '페리도트', '사파이어', '오팔', '토파즈', '탄자나이트'];

export const DREAMS = [
  { key: 'pig', label: '돼지꿈' },
  { key: 'dragon', label: '용꿈' },
  { key: 'poop', label: '똥꿈' },
  { key: 'fire', label: '불꿈' },
  { key: 'water', label: '맑은 물 꿈' },
  { key: 'ancestor', label: '조상님 꿈' },
  { key: 'none', label: '꿈 안 꿨어요' },
] as const;
export type DreamKey = (typeof DREAMS)[number]['key'];

/** 자릿수를 한 자리로 줄인 값 (1~9) */
const dr = (x: number) => 1 + ((x - 1) % 9);
/** dr(x)가 n이 되는 1~45 번호들 */
const drSet = (n: number): number[] => [n, n + 9, n + 18, n + 27, n + 36].filter((v) => v <= 45);
/** n부터 step씩 늘려 45까지 */
const series = (n: number, step: number): number[] => {
  const out: number[] = [];
  for (let v = n; v <= 45; v += step) out.push(v);
  return out;
};
const uniq = (a: number[]) => [...new Set(a.filter((v) => v >= 1 && v <= 45))];

/** primary를 우선 채우고, 모자라면 secondary로, 그래도 모자라면 무작위로 채워 6개를 만든다 */
function pick6(primary: number[], secondary: number[], rand: () => number): number[] {
  const shuffle = (arr: number[]) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const res = shuffle(uniq(primary)).slice(0, 6);
  const rest = shuffle(uniq(secondary).filter((v) => !res.includes(v)));
  while (res.length < 6 && rest.length) res.push(rest.shift()!);
  while (res.length < 6) {
    const v = 1 + Math.floor(rand() * 45);
    if (!res.includes(v)) res.push(v);
  }
  return res.sort((a, b) => a - b);
}

function signOf(month: number, day: number) {
  const md = month * 100 + day;
  return SIGNS.find((s) => md >= s.from && md <= s.to) ?? CAPRICORN;
}

/** 이름의 자음·모음 개수를 대략 세어 글자마다 1~45 사이 수를 하나씩 뽑는다 */
function nameJamo(name: string) {
  let total = 0;
  const codes: number[] = [];
  for (const ch of name) {
    const c = ch.charCodeAt(0) - 0xac00;
    if (c < 0 || c > 11171) continue;
    total += 2 + (c % 28 ? 1 : 0);
    codes.push((c % 45) + 1);
  }
  return { total, codes };
}

export interface LuckyCategory {
  key: string;
  emoji: string;
  title: string;
  tag: string;
  story: string;
  nums: number[];
  /** 필요한 정보(혈액형·이름·가족 기념일)가 없어서 못 뽑은 상태 */
  empty?: boolean;
  /** 오늘의 꿈을 고르는 카테고리인지 */
  isDream?: boolean;
}

/**
 * 오늘의 열 가지 행운 숫자.
 * 사람마다·날마다 다른 씨앗으로 뽑기 때문에 오늘은 이 숫자, 내일은 다른 숫자가 나와요.
 */
export function luckyCategories(
  profile: Profile,
  chart: SajuChart,
  opts: { dream: DreamKey; todayKey: string; now: Date; rolls: Record<string, number>; globalRoll: number },
): LuckyCategory[] {
  const { dream, todayKey, now, rolls, globalRoll } = opts;
  const day = now.getDate();
  const [, solarMonth, solarDay] = chart.solarDate.split('-').map(Number);

  const zi = BRANCH_ORDER.indexOf(chart.pillars.year.branch);
  const order = zi + 1; // 1~12
  // 삼합: 4년씩 떨어진 세 띠끼리 궁합이 좋다고 봐요 (쥐-용-원숭이, 소-뱀-닭, ...)
  const partnerIdx = Array.from({ length: 12 }, (_, i) => i).filter((i) => i % 4 === zi % 4 && i !== zi);

  const element = chart.dayMaster.element;
  const el = ELEMENT_INFO[element];
  const sign = signOf(solarMonth, solarDay);
  const blood = profile.bloodType ? BLOOD[profile.bloodType] : null;
  const family = (profile.familyEvents ?? []).filter((f): f is Required<FamilyEvent> => Boolean(f.month && f.day));
  const jamo = nameJamo(profile.name || '');
  let todayBase = day + solarDay + order;
  todayBase = ((todayBase - 1) % 45) + 1;

  const dreamMap: Record<DreamKey, { p: number[]; s: number[]; t: string }> = {
    pig: { p: [12, 24, 36], s: numbersOf('water'), t: '돼지꿈은 재물운을 뜻해요. 정해 둔 번호에 재물을 부르는 물(水)의 번호를 더했어요.' },
    dragon: { p: [5, 17, 29, 41], s: numbersOf('earth'), t: '용꿈은 큰 행운과 출세를 뜻해요. 정해 둔 번호에 든든한 흙(土)의 번호를 더했어요.' },
    poop: { p: numbersOf('earth'), s: drSet(8), t: '똥꿈은 뜻밖의 횡재를 뜻해요. 재물을 쌓는 흙(土)의 번호와 번창을 뜻하는 8의 번호를 담았어요.' },
    fire: { p: numbersOf('fire'), s: drSet(8), t: '활활 타는 불꿈은 하는 일이 잘 풀린다는 뜻이에요. 불(火) 기운의 번호를 담았어요.' },
    water: { p: numbersOf('water'), s: drSet(1), t: '맑은 물 꿈은 재물이 흘러 들어온다는 뜻이에요. 물(水) 기운의 번호를 담았어요.' },
    ancestor: { p: drSet(9), s: drSet(3), t: '조상님 꿈은 도움과 보살핌을 뜻해요. 오래도록을 뜻하는 9와 완성을 뜻하는 3의 번호를 담았어요.' },
    none: { p: drSet(dr(now.getMonth() + 1 + day)), s: [day], t: '꿈을 안 꾸셨다면 오늘 날짜의 기운으로 골랐어요. 간밤 꿈을 골라 보면 번호가 바뀌어요.' },
  };
  const dm = dreamMap[dream] ?? dreamMap.none;

  const cats: (Omit<LuckyCategory, 'nums'> & { primary: number[]; secondary: number[] })[] = [
    {
      key: 'zodiac',
      emoji: '🐉',
      title: '띠 숫자',
      tag: `${chart.animal}띠`,
      primary: series(order, 12),
      secondary: partnerIdx.flatMap((i) => series(i + 1, 12)),
      story: `${chart.animal}띠는 열두 띠 중 ${order}번째예요. 12년마다 돌아오는 번호에, 궁합이 좋다고 하는 띠들의 번호를 더했어요.`,
    },
    {
      key: 'ohaeng',
      emoji: '☯️',
      title: '오행 숫자',
      tag: `${el.name}(${el.hanja})의 기운`,
      primary: numbersOf(element),
      secondary: [],
      story: `당신을 나타내는 기운은 ${el.name}(${el.hanja})이에요. 끝자리가 ${el.digits.join('·')}인 번호에 이 기운이 담겨 있어요.`,
    },
    {
      key: 'star',
      emoji: '⭐',
      title: '별자리 숫자',
      tag: sign.name,
      primary: drSet(sign.n),
      secondary: drSet(dr(solarDay)),
      story: `${sign.name}를 지켜 주는 별은 ${sign.planet}이고, 행운의 수는 ${sign.n}이에요. 이 수와 태어난 날의 기운을 모았어요.`,
    },
    blood
      ? {
          key: 'blood',
          emoji: '🩸',
          title: '혈액형 숫자',
          tag: `${profile.bloodType}형`,
          primary: drSet(blood.n),
          secondary: drSet(dr(solarDay)),
          story: blood.text,
        }
      : {
          key: 'blood',
          emoji: '🩸',
          title: '혈액형 숫자',
          tag: '아직 넣지 않았어요',
          empty: true,
          primary: [],
          secondary: [],
          story: '혈액형을 넣으면 혈액형으로 번호를 만들어 드려요.',
        },
    {
      key: 'stone',
      emoji: '💎',
      title: '탄생석 숫자',
      tag: `${solarMonth}월 ${STONES[solarMonth - 1]}`,
      primary: series(solarMonth, 12),
      secondary: drSet(dr(solarMonth)),
      story: `${solarMonth}월의 탄생석은 ${STONES[solarMonth - 1]}이에요. 태어난 달의 번호를 담았어요.`,
    },
    {
      key: 'dream',
      emoji: '🌙',
      title: '꿈 해몽 숫자',
      tag: (DREAMS.find((x) => x.key === dream) ?? DREAMS[6]).label,
      isDream: true,
      primary: dm.p,
      secondary: dm.s,
      story: dm.t,
    },
    family.length
      ? {
          key: 'family',
          emoji: '👨‍👩‍👧',
          title: '가족 기념일 숫자',
          tag: family.map((f) => f.label || `${f.month}월 ${f.day}일`).join(', '),
          primary: family.flatMap((f) => [f.month, f.day, f.month + f.day]),
          secondary: family.flatMap((f) => drSet(dr(f.month + f.day))),
          story:
            family.map((f) => `${f.label || '기념일'} ${f.month}월 ${f.day}일`).join('과 ') +
            '에서 나온 번호예요. 소중한 날의 숫자를 그대로 담았어요.',
        }
      : {
          key: 'family',
          emoji: '👨‍👩‍👧',
          title: '가족 기념일 숫자',
          tag: '아직 넣지 않았어요',
          empty: true,
          primary: [],
          secondary: [],
          story: '가족 생일이나 결혼기념일을 넣으면 그 날짜로 번호를 만들어 드려요.',
        },
    jamo.total
      ? {
          key: 'name',
          emoji: '✍️',
          title: '이름 숫자',
          tag: `${profile.name} 님`,
          primary: [...jamo.codes, jamo.total],
          secondary: drSet(dr(jamo.total)),
          story: `${profile.name} 님 이름은 자음·모음이 ${jamo.total}개예요. 이름 글자마다 담긴 수를 모았어요.`,
        }
      : {
          key: 'name',
          emoji: '✍️',
          title: '이름 숫자',
          tag: '아직 넣지 않았어요',
          empty: true,
          primary: [],
          secondary: [],
          story: '이름을 넣으면 이름 글자로 번호를 만들어 드려요.',
        },
    {
      key: 'today',
      emoji: '📅',
      title: '오늘의 숫자',
      tag: `${now.getMonth() + 1}월 ${day}일`,
      primary: [todayBase, day],
      secondary: drSet(dr(todayBase)),
      story: `오늘 날짜와 띠 순서를 더해 만든 오늘만의 번호예요. 내일은 또 달라져요.`,
    },
    {
      key: 'lucky',
      emoji: '🍀',
      title: '전통 길수 숫자',
      tag: '3, 7, 8, 9',
      primary: [3, 7, 8, 9].flatMap(drSet),
      secondary: [],
      story: '완성의 3, 행운의 7, 번창의 8, 장수의 9. 예부터 좋다고 여긴 네 숫자의 기운을 모았어요.',
    },
  ];

  return cats.map((c) => {
    if (c.empty) return { ...c, nums: [] };
    const seed = hashString(`${todayKey}|${JSON.stringify(profile)}|${dream}|${c.key}|${rolls[c.key] ?? 0}|${globalRoll}`);
    return { ...c, nums: pick6(c.primary, c.secondary, seededRandom(seed)) };
  });
}

/**
 * 가족 궁합 숫자. 등록된 사람 모두(2명 이상)의 사주를 합쳐, 다 함께 가장 부족한 기운과
 * 각자에게 필요한 기운을 채운 6개를 뽑는다.
 */
export function familyCompat(profiles: Profile[], opts: { todayKey: string; rolls: Record<string, number>; globalRoll: number }): LuckyCategory {
  const key = 'compat';
  const emoji = '🤝';
  const title = '가족 궁합 숫자';

  const members = profiles
    .map((p) => {
      try {
        return { p, chart: computeChart(p) };
      } catch {
        return null;
      }
    })
    .filter((x): x is { p: Profile; chart: SajuChart } => x !== null);

  if (members.length < 2) {
    return {
      key,
      emoji,
      title,
      tag: '아직 한 명뿐이에요',
      empty: true,
      nums: [],
      story: '가족이나 친구를 한 명 더 등록하면, 함께 본 사주에서 서로 부족한 기운을 채우는 번호를 알려 드려요.',
    };
  }

  const combined: Record<Element, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  for (const { chart } of members) for (const e of ELEMENTS) combined[e] += chart.counts[e];
  const weakest = [...ELEMENTS].sort((a, b) => combined[a] - combined[b]);
  const primary = numbersOf(weakest[0]);
  const secondary = numbersOf(weakest[1]);

  const names = members.map((m) => m.p.name).join('·');
  const seedKey = `${opts.todayKey}|compat|${JSON.stringify(members.map((m) => m.p))}|${opts.rolls[key] ?? 0}|${opts.globalRoll}`;
  const rand = seededRandom(hashString(seedKey));
  let nums = pick6(primary, secondary, rand);

  // 등록된 사람마다 자신에게 필요한 기운이 하나도 없으면 하나를 그 기운 번호로 바꾼다
  const usefulEls = [...new Set(members.map((m) => m.chart.usefulElement))];
  for (const el of usefulEls) {
    if (nums.some((n) => numberElement(n) === el)) continue;
    const candidates = numbersOf(el).filter((n) => !nums.includes(n));
    if (!candidates.length) continue;
    const idx = Math.floor(rand() * nums.length);
    nums[idx] = candidates[Math.floor(rand() * candidates.length)];
  }
  nums = nums.sort((a, b) => a - b);

  const w = ELEMENT_INFO[weakest[0]];
  const story = `${names} 님을 함께 보면 ${w.name}(${w.hanja}) 기운이 가장 부족해요. 그래서 ${w.name} 번호를 가장 많이 담았고, 각자에게 필요한 기운도 하나씩 챙겼어요.`;

  return { key, emoji, title, tag: names, nums, story };
}

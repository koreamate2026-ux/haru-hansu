import { CONTROLS, ELEMENT_INFO, GENERATES, numbersOf } from './elements';
import { hashString, seededRandom } from './random';
import { todayKST } from './rounds';
import { dayGanzhi, type Pillar, type SajuChart } from './saju';
import type { Element, Profile } from './types';

type Relation = 'peer' | 'output' | 'wealth' | 'officer' | 'resource';

const RELATION_TEXT: Record<
  Relation,
  { name: string; hanja: string; base: number; headline: string; body: string; money: string; people: string; tip: string }
> = {
  peer: {
    name: '나와 같은 기운',
    hanja: '比劫',
    base: 68,
    headline: '나와 같은 기운이 곁에 서는 날',
    body: '뜻이 맞는 사람을 만나기 쉽고 스스로 밀고 나가는 힘이 붙어요. 다만 고집이 세지기 쉬우니 한 번 더 듣는 여유를 챙기세요.',
    money: '나눠 쓰는 돈이 생기기 쉬워요. 큰 지출은 하루 미뤄도 괜찮아요.',
    people: '오랜 친구나 동료에게 먼저 연락해 보세요.',
    tip: '혼자 결정하기보다 한 사람의 의견을 더 들어보기',
  },
  output: {
    name: '표현하는 기운',
    hanja: '食傷',
    base: 76,
    headline: '재능과 말이 밖으로 흐르는 날',
    body: '표현력이 살아나 아이디어를 꺼내기 좋은 날이에요. 말이 앞서지 않도록 마무리까지 챙기면 좋은 평가가 따라와요.',
    money: '작은 부수입이나 성과에 대한 보상이 기대돼요.',
    people: '먼저 제안하는 쪽이 주도권을 잡아요.',
    tip: '미뤄둔 글이나 기획을 하나 끝내기',
  },
  wealth: {
    name: '재물 기운',
    hanja: '財星',
    base: 80,
    headline: '손에 잡히는 결과가 보이는 날',
    body: '현실 감각이 좋아져 계산이 빠르고 실속을 챙기기 쉬워요. 욕심이 과해지지 않게 선을 정해두세요.',
    money: '재물 흐름이 가장 활발한 날이에요. 가계부를 정리하면 새는 돈이 보여요.',
    people: '거래나 약속은 문서로 확인해 두면 좋아요.',
    tip: '지출 한 가지를 줄이고 그만큼 저축하기',
  },
  officer: {
    name: '책임 기운',
    hanja: '官星',
    base: 64,
    headline: '책임과 규칙이 나를 다듬는 날',
    body: '해야 할 일이 몰려도 차근차근 처리하면 신뢰가 쌓여요. 무리한 약속은 피하고 컨디션을 챙기세요.',
    money: '고정 지출과 공과금을 점검하기 좋은 날이에요.',
    people: '윗사람과의 대화는 결론부터 말하면 잘 풀려요.',
    tip: '오늘 할 일 세 가지만 정해서 끝내기',
  },
  resource: {
    name: '도와주는 기운',
    hanja: '印星',
    base: 72,
    headline: '도움과 배움이 들어오는 날',
    body: '누군가의 조언이나 책 한 구절이 실마리가 돼요. 생각이 많아질 수 있으니 결정은 짧게 하세요.',
    money: '공부나 자기계발에 쓰는 돈은 아깝지 않은 날이에요.',
    people: '어른이나 선배의 한마디를 귀담아 들으세요.',
    tip: '궁금했던 것 하나를 찾아 배우기',
  },
};

function relationOf(dayMaster: Element, incoming: Element): Relation {
  if (incoming === dayMaster) return 'peer';
  if (GENERATES[dayMaster] === incoming) return 'output';
  if (CONTROLS[dayMaster] === incoming) return 'wealth';
  if (CONTROLS[incoming] === dayMaster) return 'officer';
  return 'resource';
}

export interface DailyFortune {
  dateLabel: string;
  todayPillar: Pillar;
  relationName: string;
  relationHanja: string;
  score: number;
  headline: string;
  body: string;
  money: string;
  people: string;
  tip: string;
  luckyColor: string;
  luckyDirection: string;
  luckyNumber: number;
  luckyElement: Element;
}

export function dailyFortune(profile: Profile, chart: SajuChart, now = Date.now()): DailyFortune {
  const t = todayKST(now);
  const today = dayGanzhi(t.y, t.m, t.d);
  const rel = relationOf(chart.dayMaster.element, today.stemElement);
  const text = RELATION_TEXT[rel];
  const rand = seededRandom(hashString(`${profile.year}-${profile.month}-${profile.day}-${profile.hour}-${t.y}-${t.m}-${t.d}`));

  let score = text.base + Math.round(rand() * 14 - 7);
  if (today.stemElement === chart.usefulElement || today.branchElement === chart.usefulElement) score += 10;
  if (chart.excessive.includes(today.stemElement)) score -= 6;
  score = Math.max(40, Math.min(98, score));

  const lucky = chart.usefulElement;
  const candidates = numbersOf(lucky);
  return {
    dateLabel: `${t.m}월 ${t.d}일`,
    todayPillar: today,
    relationName: text.name,
    relationHanja: text.hanja,
    score,
    headline: text.headline,
    body: text.body,
    money: text.money,
    people: text.people,
    tip: text.tip,
    luckyColor: ELEMENT_INFO[lucky].colorName,
    luckyDirection: ELEMENT_INFO[lucky].direction,
    luckyNumber: candidates[Math.floor(rand() * candidates.length)],
    luckyElement: lucky,
  };
}

export const DAY_MASTER_TEXT: Record<Element, string> = {
  wood: '나무처럼 위로 뻗어 자라는 기운이에요. 성장과 시작을 좋아하고 곧은 성품을 지녔어요.',
  fire: '불처럼 밝고 퍼져나가는 기운이에요. 표현이 풍부하고 사람들 사이에서 빛나요.',
  earth: '땅처럼 넓게 받아주는 기운이에요. 믿음직하고 중심을 잘 잡아요.',
  metal: '쇠처럼 단단하고 맺고 끊음이 분명한 기운이에요. 원칙과 결단력이 강점이에요.',
  water: '물처럼 스며들고 흘러가는 기운이에요. 생각이 깊고 상황에 맞춰 유연하게 움직여요.',
};

export const STRENGTH_TEXT = {
  strong: '넘치는 힘을 밖으로 풀어 주는 기운이 도움이 돼요.',
  weak: '나를 받쳐 주고 채워 주는 기운이 도움이 돼요.',
  balanced: '다섯 기운이 고르게 놓였으니, 가장 모자란 기운을 채워 주면 좋아요.',
} as const;

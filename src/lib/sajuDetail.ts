import { Solar } from 'lunar-javascript';
import { BRANCHES, CONTROLS, ELEMENT_INFO, GENERATES, STEMS, controllerOf, motherOf } from './elements';
import { termEightChar, type SajuChart } from './saju';
import type { Element, Profile } from './types';

/**
 * 하루 한수 플러스의 자세한 풀이. '나(일간)'의 기운과 그 시기의 기운이 어떤 사이인지(다섯 갈래)로
 * 10년 운(대운)·올해 운(세운)·이번 달 운(월운)을 풀고, 타고난 기운의 분포로 재물·일·관계 성향을 푼다.
 * 재미로 보는 풀이라 단정하는 말투는 피한다.
 */
export type Relation = 'same' | 'output' | 'wealth' | 'power' | 'resource';

export function relationOf(self: Element, other: Element): Relation {
  if (other === self) return 'same';
  if (other === GENERATES[self]) return 'output';
  if (other === CONTROLS[self]) return 'wealth';
  if (other === controllerOf(self)) return 'power';
  return 'resource';
}

export const REL_NAME: Record<Relation, string> = {
  same: '나와 같은 기운',
  output: '내가 드러내는 기운',
  wealth: '내가 거두는 기운',
  power: '나를 다듬는 기운',
  resource: '나를 돕는 기운',
};

const TEXT: Record<'decade' | 'year' | 'month', Record<Relation, string>> = {
  decade: {
    same: '스스로 밀고 나가는 힘이 커지고 뜻 맞는 사람이 늘어나는 시기예요. 독립하거나 새 일을 벌이기에 힘이 붙지만, 경쟁과 나가는 돈도 함께 커지기 쉬워요.',
    output: '가진 재주와 생각이 밖으로 드러나는 시기예요. 말·글·기술로 인정받기 좋고, 새로운 것을 만들어 내는 힘이 강해요. 다만 무리해서 벌이는 일은 줄이는 게 좋아요.',
    wealth: '실속과 돈을 챙기기 좋은 시기예요. 계획한 만큼 거두기 쉽고 살림을 키우기 좋아요. 욕심이 앞서면 새기 쉬우니 규칙을 정해 두세요.',
    power: '책임과 자리가 따라오는 시기예요. 직장·시험·조직 안에서 인정받기 좋지만 부담감도 함께 커져요. 몸과 마음의 쉼을 챙기세요.',
    resource: '배움과 도움이 들어오는 시기예요. 공부·자격증·문서 일이 잘 풀리고 윗사람의 도움을 받기 쉬워요. 생각만 길어지지 않게 한 걸음씩 실행해 보세요.',
  },
  year: {
    same: '올해는 친구·동료와 함께할 일이 많아지는 해예요. 함께하면 힘이 되지만 돈을 나눠 쓰는 일도 생기기 쉬우니 보증이나 동업은 신중히 하세요.',
    output: '올해는 하고 싶은 말과 재주를 펼치기 좋은 해예요. 새 취미나 부업을 시작하기 좋고, 표현한 만큼 알아주는 사람이 생겨요.',
    wealth: '올해는 돈의 흐름이 활발한 해예요. 들어오는 만큼 나가기도 쉬우니 목표 금액을 정해 두고 모아 보세요.',
    power: '올해는 맡는 일이 늘고 평가받을 일이 많은 해예요. 약속과 규칙을 잘 지키면 좋은 자리로 이어지기 쉬워요.',
    resource: '올해는 배우고 준비하기 좋은 해예요. 자격증이나 공부를 시작하기 좋고, 계약·서류 일도 잘 풀리는 편이에요.',
  },
  month: {
    same: '이번 달은 사람을 만나 힘을 얻는 달이에요. 고집은 한 번 내려놓고 함께 가 보세요.',
    output: '이번 달은 생각을 밖으로 꺼내기 좋은 달이에요. 미뤄 둔 계획을 말로 꺼내 보세요.',
    wealth: '이번 달은 살림을 챙기기 좋은 달이에요. 새는 돈이 없는지 한 번 살펴보세요.',
    power: '이번 달은 해야 할 일이 몰리기 쉬운 달이에요. 우선순위를 정해 하나씩 끝내 보세요.',
    resource: '이번 달은 도움과 정보가 들어오는 달이에요. 조언을 귀담아들으면 길이 보여요.',
  },
};

export interface LuckItem {
  ganzhi: string;
  ko: string;
  element: Element;
  relation: Relation;
  relationName: string;
  text: string;
  /** 이 시기의 기운이 나에게 필요한 기운(용신)과 같은지 */
  helpful: boolean;
}

function luckOf(ganzhi: string, chart: SajuChart, kind: keyof typeof TEXT): LuckItem {
  const stem = STEMS[ganzhi[0]];
  const branch = BRANCHES[ganzhi[1]];
  const relation = relationOf(chart.dayMaster.element, stem.element);
  const helpful = stem.element === chart.usefulElement || branch.element === chart.usefulElement;
  return {
    ganzhi,
    ko: `${stem.ko}${branch.ko}`,
    element: stem.element,
    relation,
    relationName: REL_NAME[relation],
    text: TEXT[kind][relation],
    helpful,
  };
}

export interface DecadeLuck extends LuckItem {
  startAge: number;
  endAge: number;
  startYear: number;
  endYear: number;
  current: boolean;
}

export interface SajuDetail {
  /** 성별을 모르면 null (대운은 성별에 따라 방향이 달라서) */
  decades: DecadeLuck[] | null;
  year: LuckItem & { label: string };
  month: LuckItem & { label: string };
  tendency: { money: string; work: string; people: string };
}

function tendency(chart: SajuChart): SajuDetail['tendency'] {
  const self = chart.dayMaster.element;
  const c = chart.counts;
  // 일간 자신은 빼고 센다
  const score: Record<Relation, number> = {
    same: c[self] - 1,
    output: c[GENERATES[self]],
    wealth: c[CONTROLS[self]],
    power: c[controllerOf(self)],
    resource: c[motherOf(self)],
  };

  const money =
    score.wealth >= 3
      ? '돈의 흐름을 잘 읽고 기회를 잘 잡는 편이에요. 다만 들어온 만큼 나가기도 쉬우니 자동으로 모이는 저축 습관이 도움이 돼요.'
      : score.wealth < 0.5
        ? '돈보다 의미와 사람을 먼저 보는 편이에요. 재테크는 규칙을 정해 두고 자동으로 굴러가게 해 두면 마음이 편해요.'
        : '크게 벌이기보다 꾸준히 모으는 데 강한 편이에요. 작은 목표를 여러 번 이루는 방식이 잘 맞아요.';

  const workRel = (['power', 'output', 'resource', 'same'] as const).reduce((a, b) => (score[b] > score[a] ? b : a));
  const work = {
    power: '규칙과 책임이 분명한 곳에서 인정받는 편이에요. 조직·공공·관리 일이 잘 맞아요.',
    output: '재주와 표현을 살리는 일이 잘 맞아요. 기술·창작·말로 하는 일에서 빛나기 쉬워요.',
    resource: '배우고 정리하고 가르치는 일이 잘 맞아요. 연구·교육·상담 쪽에서 힘을 내기 쉬워요.',
    same: '스스로 판단하고 이끄는 일이 잘 맞아요. 독립·자영업·팀을 꾸리는 일에 힘이 붙어요.',
  }[workRel];

  const people =
    score.same >= 3
      ? '사람을 좋아하고 무리를 이끄는 편이에요. 다만 주도권 다툼이 생기기 쉬우니 한발 물러서는 여유가 좋아요.'
      : score.resource >= 3
        ? '주변의 도움과 보살핌을 잘 받는 편이에요. 받은 만큼 먼저 표현하면 관계가 더 단단해져요.'
        : score.output >= 3
          ? '잘 챙겨 주고 분위기를 살리는 편이에요. 내 몫의 쉼도 꼭 챙기세요.'
          : '적당한 거리를 지키며 오래가는 관계를 만드는 편이에요. 가까운 사람에게는 마음을 조금 더 말로 전해 보세요.';

  return { money, work, people };
}

export function sajuDetail(profile: Profile, chart: SajuChart, now = new Date()): SajuDetail {
  const today = Solar.fromYmd(now.getFullYear(), now.getMonth() + 1, now.getDate()).getLunar();
  const thisYear = now.getFullYear();

  let decades: DecadeLuck[] | null = null;
  if (profile.gender === 'M' || profile.gender === 'F') {
    const yun = termEightChar(profile).getYun(profile.gender === 'M' ? 1 : 0);
    decades = yun
      .getDaYun(10)
      .filter((d) => d.getIndex() > 0 && d.getGanZhi())
      .map((d) => ({
        ...luckOf(d.getGanZhi(), chart, 'decade'),
        startAge: d.getStartAge(),
        endAge: d.getEndAge(),
        startYear: d.getStartYear(),
        endYear: d.getEndYear(),
        current: d.getStartYear() <= thisYear && thisYear <= d.getEndYear(),
      }));
  }

  return {
    decades,
    year: { ...luckOf(today.getYearInGanZhiExact(), chart, 'year'), label: `${thisYear}년` },
    month: { ...luckOf(today.getMonthInGanZhiExact(), chart, 'month'), label: `${now.getMonth() + 1}월` },
    tendency: tendency(chart),
  };
}

export const elementName = (e: Element) => `${ELEMENT_INFO[e].name}(${ELEMENT_INFO[e].hanja})`;

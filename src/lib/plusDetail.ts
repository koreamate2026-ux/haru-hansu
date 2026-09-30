import { ELEMENT_INFO } from './elements';
import { relationOf, type Relation } from './sajuDetail';
import type { SajuChart } from './saju';
import type { Profile } from './types';

/**
 * 플러스 상세 화면용 풀이. 두 사람의 '나(일간)' 기운이 어떤 사이인지, 띠끼리 어떤 사이인지,
 * 가족 기념일이 언제 돌아오는지를 쉬운 말로 만든다. 재미로 보는 풀이라 단정하지 않는다.
 */

/** b의 기운이 a에게 어떤 사이인지 (a를 기준으로) */
export function pairText(aName: string, bName: string, rel: Relation): string {
  switch (rel) {
    case 'same':
      return `${aName} 님과 ${bName} 님은 같은 기운이라 말하지 않아도 잘 통하는 사이예요. 다만 둘 다 고집이 설 때는 한 사람이 먼저 물러나 주세요.`;
    case 'output':
      return `${aName} 님이 ${bName} 님을 챙기고 힘을 보태 주는 사이예요. 베푸는 쪽이 지치지 않게 고마움을 표현해 주세요.`;
    case 'wealth':
      return `${aName} 님이 ${bName} 님을 이끌어 주는 사이예요. 함께 목표를 세우면 실속 있게 거두기 좋아요.`;
    case 'power':
      return `${bName} 님이 ${aName} 님을 단단하게 잡아 주는 사이예요. 잔소리처럼 들려도 도움이 되는 말이 많아요.`;
    case 'resource':
      return `${bName} 님이 ${aName} 님에게 힘을 채워 주는 사이예요. 곁에 있으면 마음이 든든해져요.`;
  }
}

export function relationBetween(a: SajuChart, b: SajuChart): Relation {
  return relationOf(a.dayMaster.element, b.dayMaster.element);
}

// ─── 띠 궁합 (삼합·육합·충) ─────────────────────────────

const SAMHAP = ['申子辰', '亥卯未', '寅午戌', '巳酉丑'];
const YUKHAP = ['子丑', '寅亥', '卯戌', '辰酉', '巳申', '午未'];
const CHUNG = ['子午', '丑未', '寅申', '卯酉', '辰戌', '巳亥'];

export interface ZodiacMatch {
  kind: 'samhap' | 'yukhap' | 'chung' | 'same' | 'plain';
  label: string;
  text: string;
}

const pairIn = (list: string[], a: string, b: string) => list.some((p) => p.includes(a) && p.includes(b));

export function zodiacMatch(a: SajuChart, b: SajuChart): ZodiacMatch {
  const x = a.pillars.year.branch;
  const y = b.pillars.year.branch;
  const names = `${a.animal}띠와 ${b.animal}띠`;
  if (x === y) return { kind: 'same', label: '같은 띠', text: `같은 ${a.animal}띠라 생각하는 방식이 닮았어요.` };
  if (pairIn(YUKHAP, x, y)) return { kind: 'yukhap', label: '육합 · 짝꿍 띠', text: `${names}는 서로 부족한 점을 채워 주는 짝꿍 띠예요.` };
  if (pairIn(SAMHAP, x, y)) return { kind: 'samhap', label: '삼합 · 한 팀 띠', text: `${names}는 같은 방향을 보고 함께 일하기 좋은 한 팀 띠예요.` };
  if (pairIn(CHUNG, x, y)) return { kind: 'chung', label: '충 · 부딪치는 띠', text: `${names}는 성향이 정반대라 부딪치기 쉬워요. 그만큼 서로에게 없는 점을 배울 수 있어요.` };
  return { kind: 'plain', label: '무난한 띠', text: `${names}는 크게 부딪치지도 끌리지도 않는 무난한 사이예요.` };
}

// ─── 가족 기념일 ─────────────────────────────────────

export interface UpcomingEvent {
  personName: string;
  label: string;
  month: number;
  day: number;
  /** 오늘부터 며칠 뒤인지 (오늘이면 0) */
  daysLeft: number;
  /** 날짜에서 나온 번호 후보: 월, 일, 월+일 */
  numbers: number[];
}

export function upcomingEvents(profiles: Profile[], today = new Date()): UpcomingEvent[] {
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const list: UpcomingEvent[] = [];
  for (const p of profiles) {
    for (const e of p.familyEvents ?? []) {
      if (!e.month || !e.day) continue;
      let next = new Date(today.getFullYear(), e.month - 1, e.day).getTime();
      if (next < base) next = new Date(today.getFullYear() + 1, e.month - 1, e.day).getTime();
      const numbers = [...new Set([e.month, e.day, e.month + e.day])].filter((n) => n >= 1 && n <= 45);
      list.push({ personName: p.name, label: e.label || '기념일', month: e.month, day: e.day, daysLeft: Math.round((next - base) / 86400000), numbers });
    }
  }
  return list.sort((a, b) => a.daysLeft - b.daysLeft);
}

export const elementLabel = (e: SajuChart['dayMaster']['element']) => `${ELEMENT_INFO[e].name}(${ELEMENT_INFO[e].hanja})`;

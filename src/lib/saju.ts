import { Lunar, Solar, type SolarDate } from 'lunar-javascript';
import { convertKoreanClock } from './koreaTime';
import { BRANCHES, CONTROLS, ELEMENTS, GENERATES, STEMS, controllerOf, motherOf } from './elements';
import type { Element, Profile } from './types';

export interface Pillar {
  label: '연주' | '월주' | '일주' | '시주';
  stem: string;
  branch: string;
  stemKo: string;
  branchKo: string;
  stemElement: Element;
  branchElement: Element;
}

export interface SajuChart {
  pillars: { year: Pillar; month: Pillar; day: Pillar; time: Pillar | null };
  dayMaster: { hanja: string; ko: string; element: Element; yang: boolean };
  /** 오행별 점수. 월지(태어난 달의 지지)는 계절의 기운이라 2로 센다 */
  counts: Record<Element, number>;
  total: number;
  strength: 'strong' | 'weak' | 'balanced';
  /** 부족함을 채우거나 넘침을 덜어주는 오행 (억부법을 단순화한 용신) */
  usefulElement: Element;
  lacking: Element[];
  excessive: Element[];
  solarDate: string;
  lunarLabel: string;
  animal: string;
  /** 서머타임 기간 출생이라 1시간을 빼고 계산했는지 */
  dstAdjusted: boolean;
}

export class BirthDateError extends Error {}

function toPillar(label: Pillar['label'], ganzhi: string): Pillar {
  const stem = ganzhi[0];
  const branch = ganzhi[1];
  return {
    label,
    stem,
    branch,
    stemKo: STEMS[stem].ko,
    branchKo: BRANCHES[branch].ko,
    stemElement: STEMS[stem].element,
    branchElement: BRANCHES[branch].element,
  };
}

/** 입력(양력/음력)을 양력 시각으로 변환. 존재하지 않는 날짜면 BirthDateError */
export function toSolar(p: Pick<Profile, 'calendar' | 'leapMonth' | 'year' | 'month' | 'day' | 'hour' | 'minute'>): SolarDate {
  const hour = p.hour ?? 12;
  const minute = p.hour === null ? 0 : p.minute;
  if (p.year < 1900 || p.year > 2100) throw new BirthDateError('1900년부터 2100년 사이의 날짜만 계산할 수 있어요.');
  if (p.month < 1 || p.month > 12) throw new BirthDateError('월은 1부터 12 사이로 입력해 주세요.');
  if (p.day < 1 || p.day > 31) throw new BirthDateError('일은 1부터 31 사이로 입력해 주세요.');
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) throw new BirthDateError('시간은 0시~23시, 분은 0~59로 입력해 주세요.');

  try {
    if (p.calendar === 'solar') {
      // 라이브러리는 2월 30일 같은 날짜도 받아주므로 직접 검사
      const check = new Date(Date.UTC(p.year, p.month - 1, p.day));
      if (check.getUTCMonth() !== p.month - 1 || check.getUTCDate() !== p.day) throw new Error('invalid');
      return Solar.fromYmdHms(p.year, p.month, p.day, hour, minute, 0);
    }
    const l = Lunar.fromYmdHms(p.year, p.leapMonth ? -p.month : p.month, p.day, hour, minute, 0);
    return l.getSolar();
  } catch {
    if (p.calendar === 'lunar' && p.leapMonth) throw new BirthDateError(`${p.year}년에는 윤${p.month}월이 없어요.`);
    throw new BirthDateError('존재하지 않는 날짜예요. 다시 확인해 주세요.');
  }
}

export function computeChart(p: Profile): SajuChart {
  const solar = toSolar(p);
  const hour = p.hour ?? 12;
  const minute = p.hour === null ? 0 : p.minute;
  const conv = convertKoreanClock({ y: solar.getYear(), m: solar.getMonth(), d: solar.getDay(), h: hour, mi: minute });
  // 연주·월주: 절기 경계를 중국 표준시로 계산하는 라이브러리에 맞춰 변환한 시각으로
  const ct = conv.chinaTime;
  const ecTerm = Solar.fromYmdHms(ct.y, ct.m, ct.d, ct.h, ct.mi, 0).getLunar().getEightChar();
  // 일주·시주: 서머타임을 뺀 한국 표준시각으로. sect 2 = 야자시(23시대)는 다음 날로 넘기지 않음
  const st = conv.standardLocal;
  const ec = Solar.fromYmdHms(st.y, st.m, st.d, st.h, st.mi, 0).getLunar().getEightChar();
  ec.setSect(2);

  const pillars = {
    year: toPillar('연주', ecTerm.getYear()),
    month: toPillar('월주', ecTerm.getMonth()),
    day: toPillar('일주', ec.getDay()),
    time: p.hour === null ? null : toPillar('시주', ec.getTime()),
  };

  const counts: Record<Element, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  for (const key of ['year', 'month', 'day', 'time'] as const) {
    const pl = pillars[key];
    if (!pl) continue;
    counts[pl.stemElement] += 1;
    counts[pl.branchElement] += key === 'month' ? 2 : 1;
  }
  const total = ELEMENTS.reduce((s, e) => s + counts[e], 0);

  const dm = STEMS[pillars.day.stem];
  const self = dm.element;
  const mother = motherOf(self);
  const support = counts[self] + counts[mother];
  const ratio = support / total;
  const strength: SajuChart['strength'] = ratio >= 0.55 ? 'strong' : ratio <= 0.4 ? 'weak' : 'balanced';

  let usefulElement: Element;
  if (strength === 'weak') {
    usefulElement = counts[mother] <= counts[self] ? mother : self;
  } else if (strength === 'strong') {
    // 기운이 넘치면 설기(식상)·재성·관성 중 가장 약한 쪽으로 흘려보낸다
    const outlets: Element[] = [GENERATES[self], CONTROLS[self], controllerOf(self)];
    usefulElement = outlets.reduce((a, b) => (counts[b] < counts[a] ? b : a));
  } else {
    usefulElement = ELEMENTS.reduce((a, b) => (counts[b] < counts[a] ? b : a));
  }

  const min = Math.min(...ELEMENTS.map((e) => counts[e]));
  const avg = total / 5;
  const lacking = ELEMENTS.filter((e) => counts[e] === 0 || (min > 0 && counts[e] === min));
  const excessive = ELEMENTS.filter((e) => counts[e] >= avg * 2);

  const lunar = solar.getLunar();
  const lm = lunar.getMonth();
  const lunarLabel = `음력 ${lunar.getYear()}년 ${lm < 0 ? '윤' : ''}${Math.abs(lm)}월 ${lunar.getDay()}일`;

  return {
    pillars,
    dayMaster: { hanja: pillars.day.stem, ko: dm.ko, element: self, yang: dm.yang },
    counts,
    total,
    strength,
    usefulElement,
    lacking,
    excessive,
    solarDate: solar.toYmd(),
    lunarLabel,
    animal: BRANCHES[pillars.year.branch].animal,
    dstAdjusted: p.hour !== null && conv.dstMinutes > 0,
  };
}

/** 특정 양력 날짜의 일진(그날의 간지) */
export function dayGanzhi(y: number, m: number, d: number) {
  const gz = Solar.fromYmd(y, m, d).getLunar().getDayInGanZhi();
  return toPillar('일주', gz);
}

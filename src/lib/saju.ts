import { Lunar, Solar, type EightChar, type SolarDate } from 'lunar-javascript';
import { convertKoreanClock } from './koreaTime';
import { KEYS, load } from './storage';
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
  /**
   * 오행별 점수(풀이용). 겉 글자 8개 + 지지 속 숨은 기운(지장간)까지 센다.
   * 월지(태어난 달의 지지)는 계절의 기운이라 2로 센다
   */
  counts: Record<Element, number>;
  /** 겉으로 보이는 글자만 센 개수 */
  visibleCounts: Record<Element, number>;
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
  /** 한국 경도에 맞춰 출생 시각을 보정했는지(분). 0이면 보정 안 함 */
  solarAdjustMinutes: number;
  /** 태어난 달이 나를 돕는 계절인지(득령) */
  seasonSupport: boolean;
}

/**
 * 진태양시 보정: 한국 표준시는 동경 135도 기준이라, 서울(약 127도)에서는 해가 약 32분 늦다.
 * 국내 사주 풀이 관행대로 일주·시주를 정할 때 32분을 뺀다(설정에서 끌 수 있음).
 */
export const SOLAR_ADJUST_MINUTES = 32;
// 설정에 저장된 값으로 시작한다(첫 화면부터 같은 기준으로 계산되도록)
let trueSolarTime = load<{ trueSolarTime?: boolean }>(KEYS.settings, {}).trueSolarTime !== false;
export function setTrueSolarTime(on: boolean) {
  trueSolarTime = on;
}
export const isTrueSolarTime = () => trueSolarTime;

/** 지장간: 지지 속에 숨은 천간(여기·중기). 본기는 지지 자체의 오행으로 이미 센다 */
const HIDDEN_STEMS: Record<string, string[]> = {
  子: ['壬'],
  丑: ['癸', '辛'],
  寅: ['戊', '丙'],
  卯: ['甲'],
  辰: ['乙', '癸'],
  巳: ['戊', '庚'],
  午: ['丙', '己'],
  未: ['丁', '乙'],
  申: ['戊', '壬'],
  酉: ['庚'],
  戌: ['辛', '丁'],
  亥: ['戊', '甲'],
};
const HIDDEN_WEIGHT = 0.3;
const HIDDEN_WEIGHT_MONTH = 0.5;

const round1 = (n: number) => Math.round(n * 10) / 10;

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
/** 좋아하는 사람(위인)은 옛날 사람이라 이 해부터 받는다. 일반 사람 입력은 1900년부터 */
export const HISTORIC_MIN_YEAR = 1300;

export function toSolar(
  p: Pick<Profile, 'calendar' | 'leapMonth' | 'year' | 'month' | 'day' | 'hour' | 'minute'>,
  minYear = 1900,
): SolarDate {
  const hour = p.hour ?? 12;
  const minute = p.hour === null ? 0 : p.minute;
  if (p.year < minYear || p.year > 2100) throw new BirthDateError(`${minYear}년부터 2100년 사이의 날짜만 계산할 수 있어요.`);
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

function birthMoments(p: Profile, minYear?: number) {
  const solar = toSolar(p, minYear);
  const hour = p.hour ?? 12;
  const minute = p.hour === null ? 0 : p.minute;
  const conv = convertKoreanClock({ y: solar.getYear(), m: solar.getMonth(), d: solar.getDay(), h: hour, mi: minute });
  // 연주·월주: 절기 경계를 중국 표준시로 계산하는 라이브러리에 맞춰 변환한 시각으로
  const ct = conv.chinaTime;
  const ecTerm = Solar.fromYmdHms(ct.y, ct.m, ct.d, ct.h, ct.mi, 0).getLunar().getEightChar();
  return { solar, conv, ecTerm };
}

/** 대운 계산용: 연주·월주를 세운 것과 같은 기준(절기)의 팔자 */
export const termEightChar = (p: Profile): EightChar => birthMoments(p).ecTerm;

export function computeChart(p: Profile, minYear?: number): SajuChart {
  const { solar, conv, ecTerm } = birthMoments(p, minYear);
  // 일주·시주: 서머타임을 뺀 한국 표준시각으로. sect 2 = 야자시(23시대)는 다음 날로 넘기지 않음
  // 진태양시: 시각을 아는 사람만 32분을 뺀다(자정 무렵이면 날짜가 하루 앞으로 갈 수 있음)
  const adjust = trueSolarTime && p.hour !== null ? SOLAR_ADJUST_MINUTES : 0;
  const stRaw = conv.standardLocal;
  const shifted = new Date(Date.UTC(stRaw.y, stRaw.m - 1, stRaw.d, stRaw.h, stRaw.mi) - adjust * 60000);
  const st = { y: shifted.getUTCFullYear(), m: shifted.getUTCMonth() + 1, d: shifted.getUTCDate(), h: shifted.getUTCHours(), mi: shifted.getUTCMinutes() };
  const ec = Solar.fromYmdHms(st.y, st.m, st.d, st.h, st.mi, 0).getLunar().getEightChar();
  ec.setSect(2);

  const pillars = {
    year: toPillar('연주', ecTerm.getYear()),
    month: toPillar('월주', ecTerm.getMonth()),
    day: toPillar('일주', ec.getDay()),
    time: p.hour === null ? null : toPillar('시주', ec.getTime()),
  };

  const visibleCounts: Record<Element, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  const counts: Record<Element, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  for (const key of ['year', 'month', 'day', 'time'] as const) {
    const pl = pillars[key];
    if (!pl) continue;
    visibleCounts[pl.stemElement] += 1;
    visibleCounts[pl.branchElement] += key === 'month' ? 2 : 1;
    counts[pl.stemElement] += 1;
    counts[pl.branchElement] += key === 'month' ? 2 : 1;
    for (const h of HIDDEN_STEMS[pl.branch] ?? []) counts[STEMS[h].element] += key === 'month' ? HIDDEN_WEIGHT_MONTH : HIDDEN_WEIGHT;
  }
  for (const e of ELEMENTS) counts[e] = round1(counts[e]);
  const total = round1(ELEMENTS.reduce((s, e) => s + counts[e], 0));

  const dm = STEMS[pillars.day.stem];
  const self = dm.element;
  const mother = motherOf(self);
  const support = counts[self] + counts[mother];
  // 득령: 태어난 달(월지)이 나와 같거나 나를 낳는 기운이면 힘을 얻는다
  const monthEl = pillars.month.branchElement;
  const seasonSupport = monthEl === self || monthEl === mother;
  // 통근: 지지(속 숨은 기운 포함)에 나와 같은 기운의 뿌리가 있는지
  const rooted = (['year', 'month', 'day', 'time'] as const).some((k) => {
    const pl = pillars[k];
    return pl && (pl.branchElement === self || (HIDDEN_STEMS[pl.branch] ?? []).some((h) => STEMS[h].element === self));
  });
  const ratio = support / total + (seasonSupport ? 0.08 : -0.08) + (rooted ? 0 : -0.05);
  const strength: SajuChart['strength'] = ratio >= 0.55 ? 'strong' : ratio <= 0.42 ? 'weak' : 'balanced';

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

  // 부족: 숨은 기운까지 쳐도 1이 안 되는 기운(없으면 가장 적은 기운), 과다: 평균의 두 배 이상
  const min = Math.min(...ELEMENTS.map((e) => counts[e]));
  const avg = total / 5;
  const lacking = ELEMENTS.filter((e) => counts[e] < 1 || counts[e] === min);
  const excessive = ELEMENTS.filter((e) => counts[e] >= avg * 2);

  const lunar = solar.getLunar();
  const lm = lunar.getMonth();
  const lunarLabel = `음력 ${lunar.getYear()}년 ${lm < 0 ? '윤' : ''}${Math.abs(lm)}월 ${lunar.getDay()}일`;

  return {
    pillars,
    dayMaster: { hanja: pillars.day.stem, ko: dm.ko, element: self, yang: dm.yang },
    counts,
    visibleCounts,
    total,
    strength,
    usefulElement,
    lacking,
    excessive,
    solarDate: solar.toYmd(),
    lunarLabel,
    animal: BRANCHES[pillars.year.branch].animal,
    dstAdjusted: p.hour !== null && conv.dstMinutes > 0,
    solarAdjustMinutes: adjust,
    seasonSupport,
  };
}

/** 특정 양력 날짜의 일진(그날의 간지) */
export function dayGanzhi(y: number, m: number, d: number) {
  const gz = Solar.fromYmd(y, m, d).getLunar().getDayInGanZhi();
  return toPillar('일주', gz);
}

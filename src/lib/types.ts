export type Element = 'wood' | 'fire' | 'earth' | 'metal' | 'water';

export interface FamilyEvent {
  label: string;
  /** 0이면 아직 입력하지 않은 자리 */
  month: number;
  day: number;
}

export interface Profile {
  id: string;
  name: string;
  calendar: 'solar' | 'lunar';
  leapMonth: boolean;
  year: number;
  month: number;
  day: number;
  /** 0–23. null이면 태어난 시간을 모름 → 시주 없이 6글자로 계산 */
  hour: number | null;
  minute: number;
  /** 오늘의 행운 숫자 중 혈액형 숫자용. 모르면 null */
  bloodType: 'A' | 'B' | 'O' | 'AB' | null;
  /** 10년 운(대운) 계산에만 쓴다. 예전에 저장한 사람은 값이 없을 수 있음 */
  gender?: 'M' | 'F' | null;
  /** 오늘의 행운 숫자 중 가족 기념일 숫자용. 최대 2개, 비워 둘 수 있음 */
  familyEvents: FamilyEvent[];
  /** 가족 연동: 이 사람과 연결된 계정(서버 동기화 중일 때만) */
  linkedAccountId?: string | null;
  /** 이 사람을 등록한 계정. 지우기 권한 판단용 */
  createdByAccountId?: string | null;
  createdAt: number;
}

export interface SavedTicket {
  id: string;
  profileId: string | null;
  profileName: string;
  /** 여러 명이 함께 만든 번호(가족 궁합 등)일 때, 참여한 사람 전부의 id */
  profileIds?: string[];
  round: number;
  numbers: number[];
  source: 'saju' | 'manual';
  /** 어떤 근거로 뽑았는지 (zodiac·ohaeng·compat·star·blood·stone·dream·family·name·today·lucky·manual) */
  category?: string;
  createdAt: number;
}

export interface DrawResult {
  round: number;
  date: string; // YYYY-MM-DD
  numbers: number[];
  bonus: number;
  source: 'api' | 'manual';
}

export interface Settings {
  /** 당첨번호 조회 주소. 비워두면 동행복권 기본 주소를 사용 */
  drawApiBase: string;
}

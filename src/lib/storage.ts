const PREFIX = 'ohaengsu:';

export const KEYS = {
  profiles: 'profiles',
  activeProfileId: 'activeProfileId',
  tickets: 'tickets',
  draws: 'draws',
  settings: 'settings',
  dream: 'dream',
  auth: 'auth',
  currentHouseholdId: 'currentHouseholdId',
  dailyPicks: 'dailyPicks',
  favoriteActive: 'favoriteActive',
  /** 로그인 전에 연 초대 링크의 코드. 로그인하면 참여 화면으로 이어 준다 */
  pendingJoin: 'pendingJoin',
} as const;

/** 브라우저 저장소(localStorage). 개인 정보 보호 모드 등에서 막히면 기본값으로 동작 */
export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function save<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.warn('저장 실패', key, e);
  }
}

export function clearAll(): void {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // 저장소를 쓸 수 없으면 지울 것도 없음
  }
}

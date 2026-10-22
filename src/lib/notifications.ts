import { LocalNotifications } from '@capacitor/local-notifications';
import { dailyFortune } from './fortune';
import { isNativeApp } from './platform';
import type { SajuChart } from './saju';
import { KEYS, load, save } from './storage';
import type { Profile } from './types';

/**
 * 매일 "오늘의 숫자" 알림(휴대폰 안에서 예약하는 로컬 알림 — 서버·Firebase 없이 동작).
 * 정확한 시각이 필요 없어 isExactNotification: false로 둔다(안드로이드가 '알람 및 리마인더' 설정 화면을 띄우지 않게).
 * 날마다 그날의 운세 한 줄을 넣고 싶어서, 반복 알림 하나 대신 앞으로 14일치를 하루씩 예약하고
 * 앱을 열 때마다 다시 채운다(오래 안 열면 14일 뒤에 멈춤 → 그동안 앱을 열면 계속 이어짐).
 */
export interface NotifySettings {
  enabled: boolean;
  hour: number;
  minute: number;
}

export const DEFAULT_NOTIFY: NotifySettings = { enabled: false, hour: 8, minute: 0 };
export const NOTIFY_TIMES = [
  { hour: 7, label: '오전 7시' },
  { hour: 8, label: '오전 8시' },
  { hour: 9, label: '오전 9시' },
  { hour: 12, label: '낮 12시' },
  { hour: 18, label: '저녁 6시' },
  { hour: 21, label: '밤 9시' },
];

const DAYS_AHEAD = 14;
/** 예약 알림 번호: 1001~1014는 매일 알림, 1999는 '지금 받아 보기' */
const DAILY_IDS = Array.from({ length: DAYS_AHEAD }, (_, i) => 1001 + i);
const TEST_ID = 1999;

export const getNotifySettings = () => ({ ...DEFAULT_NOTIFY, ...load<Partial<NotifySettings>>(KEYS.notify, {}) });
const saveNotifySettings = (s: NotifySettings) => save(KEYS.notify, s);

export type NotifyPermission = 'granted' | 'denied' | 'prompt';

export async function notifyPermission(): Promise<NotifyPermission> {
  if (!isNativeApp) return 'denied';
  const p = await LocalNotifications.checkPermissions();
  return p.display === 'granted' ? 'granted' : p.display === 'denied' ? 'denied' : 'prompt';
}

async function ensurePermission(): Promise<boolean> {
  if (!isNativeApp) return false;
  const p = await LocalNotifications.checkPermissions();
  if (p.display === 'granted') return true;
  if (p.display === 'denied') return false;
  return (await LocalNotifications.requestPermissions()).display === 'granted';
}

function messageFor(profile: Profile | null, chart: SajuChart | null, at: Date) {
  if (!profile || !chart) return { title: '하루 한수', body: '오늘의 숫자가 나왔어요. 확인해 보세요.' };
  try {
    const f = dailyFortune(profile, chart, at.getTime());
    return { title: `${profile.name}님의 오늘의 숫자`, body: `오늘은 '${f.headline}'. 오늘의 숫자를 확인해 보세요.` };
  } catch {
    return { title: '하루 한수', body: `${profile.name}님, 오늘의 숫자가 나왔어요.` };
  }
}

/** 앞으로 14일치 매일 알림을 다시 예약한다(설정이 꺼져 있으면 모두 지운다) */
export async function rescheduleDaily(profile: Profile | null, chart: SajuChart | null): Promise<void> {
  if (!isNativeApp) return;
  const s = getNotifySettings();
  await LocalNotifications.cancel({ notifications: DAILY_IDS.map((id) => ({ id })) });
  if (!s.enabled || (await notifyPermission()) !== 'granted') return;
  const now = new Date();
  const notifications = DAILY_IDS.map((id, i) => {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, s.hour, s.minute, 0);
    return { id, at };
  })
    .filter(({ at }) => at.getTime() > now.getTime() + 60_000)
    .map(({ id, at }) => ({ id, ...messageFor(profile, chart, at), schedule: { at }, isExactNotification: false, extra: { route: '/' } }));
  if (notifications.length) await LocalNotifications.schedule({ notifications });
}

/** 매일 알림 켜기·끄기·시간 바꾸기. 켤 때 권한이 없으면 false */
export async function setDailyNotify(next: Partial<NotifySettings>, profile: Profile | null, chart: SajuChart | null): Promise<boolean> {
  const merged = { ...getNotifySettings(), ...next };
  if (merged.enabled && !(await ensurePermission())) {
    saveNotifySettings({ ...merged, enabled: false });
    return false;
  }
  saveNotifySettings(merged);
  await rescheduleDaily(profile, chart);
  return true;
}

/** '지금 한 번 받아 보기': 5초 뒤 알림 한 번 */
export async function sendTestNotification(profile: Profile | null, chart: SajuChart | null): Promise<boolean> {
  if (!(await ensurePermission())) return false;
  const at = new Date(Date.now() + 5000);
  await LocalNotifications.schedule({ notifications: [{ id: TEST_ID, ...messageFor(profile, chart, new Date()), schedule: { at }, isExactNotification: false }] });
  return true;
}

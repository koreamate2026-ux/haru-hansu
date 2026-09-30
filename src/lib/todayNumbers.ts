import { useCallback, useMemo, useState } from 'react';
import { useApp } from '../state/AppState';
import { familyCompat, luckyCategories, type LuckyCategory } from './luckyNumbers';
import { KEYS, load, save } from './storage';

export const MAX_DAILY_PICKS = 6;

const NO_ROLLS: Record<string, number> = {};

export const todayKeyOf = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

/** 홈과 숫자 추가 화면이 같은 번호를 보도록, 오늘의 카테고리 숫자를 한곳에서 계산한다 */
export function useTodayCategories() {
  const { profiles, activeProfile, activeChart, todayDream } = useApp();
  const now = useMemo(() => new Date(), []);
  const todayKey = todayKeyOf(now);

  const categories = useMemo(() => {
    if (!activeProfile || !activeChart) return null;
    const cats = luckyCategories(activeProfile, activeChart, { dream: todayDream, todayKey, now, rolls: NO_ROLLS, globalRoll: 0 });
    const family = familyCompat(profiles, { todayKey, rolls: NO_ROLLS, globalRoll: 0 });
    // 오행 숫자 바로 다음에 가족 궁합 숫자를 끼워 넣는다
    return [...cats.slice(0, 2), family, ...cats.slice(2)];
  }, [profiles, activeProfile, activeChart, todayDream, todayKey, now]);

  return { now, categories };
}

interface StoredPicks {
  day: string;
  nums: number[];
}

/** 오늘 담은 숫자. 화면을 옮겨도 유지되도록 저장하고, 날짜가 바뀌면 비운다 */
export function useDailyPicks() {
  const day = todayKeyOf(new Date());
  const [picks, setPicks] = useState<number[]>(() => {
    const stored = load<StoredPicks | null>(KEYS.dailyPicks, null);
    return stored?.day === day ? stored.nums : [];
  });

  const update = useCallback(
    (fn: (prev: number[]) => number[]) =>
      setPicks((prev) => {
        const next = fn(prev);
        save<StoredPicks>(KEYS.dailyPicks, { day, nums: next });
        return next;
      }),
    [day],
  );

  const add = useCallback(
    (n: number) => update((prev) => (prev.includes(n) || prev.length >= MAX_DAILY_PICKS ? prev : [...prev, n])),
    [update],
  );
  const toggle = useCallback(
    (n: number) =>
      update((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : prev.length < MAX_DAILY_PICKS ? [...prev, n] : prev)),
    [update],
  );
  const clear = useCallback(() => update(() => []), [update]);

  return { picks, add, toggle, clear };
}

/** 아직 안 담은 카테고리 숫자 중 하나를 고르고, 다 담았으면 1~45에서 남은 번호 중 하나 */
export function randomPick(categories: LuckyCategory[], picks: number[]): { n: number; from: LuckyCategory | null } {
  const pool = categories.filter((c) => !c.empty && !picks.includes(c.nums[0]));
  if (pool.length) {
    const c = pool[Math.floor(Math.random() * pool.length)];
    return { n: c.nums[0], from: c };
  }
  const remaining = Array.from({ length: 45 }, (_, i) => i + 1).filter((n) => !picks.includes(n));
  return { n: remaining[Math.floor(Math.random() * remaining.length)], from: null };
}

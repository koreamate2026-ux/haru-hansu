import { useCallback, useMemo, useState } from 'react';
import { useApp } from '../state/AppState';
import { useBilling } from '../state/BillingState';
import { favoriteAsProfile, useFavorites } from '../state/FavoritesState';
import { familyCompat, favoriteCompat, luckyCategories, type LuckyCategory } from './luckyNumbers';
import { hashString, seededRandom } from './random';
import { upcomingRound } from './rounds';
import { KEYS, load, save } from './storage';

export const MAX_DAILY_PICKS = 6;

const NO_ROLLS: Record<string, number> = {};

/** 플러스 회원만 볼 수 있는 카테고리 */
export const PLUS_KEYS = new Set(['compat', 'family', 'favorite']);

export const todayKeyOf = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

/** 홈과 숫자 추가 화면이 같은 번호를 보도록, 오늘의 카테고리 숫자를 한곳에서 계산한다 */
export function useTodayCategories() {
  const { profiles, activeProfile, activeChart, todayDream } = useApp();
  const { premium } = useBilling();
  const { active: favorite } = useFavorites();
  const now = useMemo(() => new Date(), []);
  const todayKey = todayKeyOf(now);

  const categories = useMemo(() => {
    if (!activeProfile || !activeChart) return null;
    const cats = luckyCategories(activeProfile, activeChart, { dream: todayDream, todayKey, now, rolls: NO_ROLLS, globalRoll: 0 });
    const family = familyCompat(profiles, { todayKey, rolls: NO_ROLLS, globalRoll: 0 });
    // 오행 숫자 바로 다음에 가족 궁합 숫자를 끼워 넣는다
    const all = [...cats.slice(0, 2), family, ...cats.slice(2)];
    // 가족 숫자(가족 궁합·가족 기념일)와 좋아하는 사람 궁합 숫자는 플러스 회원만
    if (!premium) return all.filter((c) => !PLUS_KEYS.has(c.key));
    if (favorite) all.push(favoriteCompat(activeProfile, favoriteAsProfile(favorite), { todayKey }));
    return all;
  }, [profiles, activeProfile, activeChart, todayDream, todayKey, now, premium, favorite]);

  return { now, categories };
}

/** 1주일(로또 1회차)에 받을 수 있는 번호 추천 횟수 */
export const WEEKLY_SETS_FREE = 1;
export const WEEKLY_SETS_PLUS = 3;

interface StoredWeek {
  /** 추첨 전인 이번 회차. 토요일 추첨이 끝나면 다음 회차로 넘어가며 새로 시작한다 */
  round: number;
  nums: number[];
  /** 지금 모으는 것이 이번 주 몇 번째 추천인지(1부터) */
  set: number;
}

/**
 * 이번 주 번호 모으기. 6개를 다 모으면 같은 주에는 새 번호를 무작위로 더 받을 수 없고,
 * "새 번호 받기"로 다음 추천을 시작할 때만 횟수를 쓴다(무료 1번, 플러스 3번).
 * 이 기기에 저장한다.
 */
export function useWeeklyPicks() {
  const { premium } = useBilling();
  const round = upcomingRound();
  const [state, setState] = useState<StoredWeek>(() => {
    const stored = load<StoredWeek | null>(KEYS.weeklyPicks, null);
    return stored?.round === round ? stored : { round, nums: [], set: 1 };
  });
  const limit = premium ? WEEKLY_SETS_PLUS : WEEKLY_SETS_FREE;

  const update = useCallback(
    (fn: (prev: StoredWeek) => StoredWeek) =>
      setState((prev) => {
        const base = prev.round === round ? prev : { round, nums: [], set: 1 };
        const next = fn(base);
        save<StoredWeek>(KEYS.weeklyPicks, next);
        return next;
      }),
    [round],
  );

  const add = useCallback(
    (n: number) => update((p) => (p.nums.includes(n) || p.nums.length >= MAX_DAILY_PICKS ? p : { ...p, nums: [...p.nums, n] })),
    [update],
  );
  const toggle = useCallback(
    (n: number) =>
      update((p) => ({
        ...p,
        nums: p.nums.includes(n) ? p.nums.filter((x) => x !== n) : p.nums.length < MAX_DAILY_PICKS ? [...p.nums, n] : p.nums,
      })),
    [update],
  );

  // 번호를 하나라도 담기 시작한 추천은 쓴 것으로 센다
  const used = state.nums.length ? state.set : state.set - 1;
  const remaining = Math.max(0, limit - used);
  /** 새 추천을 시작할 수 있는지(지금 추천이 마지막이면 불가) */
  const canStartNew = state.set < limit;
  const startNew = useCallback(() => {
    if (!canStartNew) return false;
    update((p) => ({ ...p, nums: [], set: p.set + 1 }));
    return true;
  }, [canStartNew, update]);

  return { picks: state.nums, add, toggle, round, set: state.set, limit, used, remaining, canStartNew, startNew };
}

/**
 * 아직 안 담은 카테고리 숫자 중 하나를 고르고, 다 담았으면 1~45에서 남은 번호 중 하나.
 * 같은 주·같은 추천·같은 자리에서는 늘 같은 번호가 나와서, 다시 눌러 바꿀 수 없다.
 */
export function randomPick(categories: LuckyCategory[], picks: number[], seedKey: string): { n: number; from: LuckyCategory | null } {
  const rand = seededRandom(hashString(`${seedKey}|${picks.length}`));
  const pool = categories.filter((c) => !c.empty && !picks.includes(c.nums[0]));
  if (pool.length) {
    const c = pool[Math.floor(rand() * pool.length)];
    return { n: c.nums[0], from: c };
  }
  const remaining = Array.from({ length: 45 }, (_, i) => i + 1).filter((n) => !picks.includes(n));
  return { n: remaining[Math.floor(rand() * remaining.length)], from: null };
}

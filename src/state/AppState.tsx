import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { fetchDraw } from '../lib/draws';
import type { DreamKey } from '../lib/luckyNumbers';
import { todayKST } from '../lib/rounds';
import { computeChart, type SajuChart } from '../lib/saju';
import { KEYS, clearAll, load, save } from '../lib/storage';
import type { DrawResult, Profile, SavedTicket, Settings } from '../lib/types';

const DEFAULT_SETTINGS: Settings = { drawApiBase: '' };

function todayKey(): string {
  const t = todayKST();
  return `${t.y}-${t.m}-${t.d}`;
}

/** 오늘 고른 꿈. 날짜가 바뀌면 '안 꿨어요'로 되돌아간다 */
function initialDream(): DreamKey {
  const saved = load<{ date: string; value: DreamKey } | null>(KEYS.dream, null);
  return saved && saved.date === todayKey() ? saved.value : 'none';
}

interface AppStateValue {
  profiles: Profile[];
  activeProfile: Profile | null;
  activeChart: SajuChart | null;
  setActiveProfile: (id: string) => void;
  upsertProfile: (p: Profile) => void;
  deleteProfile: (id: string) => void;
  tickets: SavedTicket[];
  addTicket: (t: SavedTicket) => void;
  removeTicket: (id: string) => void;
  hasTicket: (round: number, numbers: number[]) => boolean;
  draws: Record<number, DrawResult>;
  loadDraw: (round: number) => Promise<DrawResult | null>;
  saveManualDraw: (d: DrawResult) => void;
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  todayDream: DreamKey;
  setTodayDream: (d: DreamKey) => void;
  resetAll: () => void;
}

const Ctx = createContext<AppStateValue | null>(null);

function initialActiveId(profiles: Profile[]) {
  const a = load<string | null>(KEYS.activeProfileId, null);
  return a && profiles.some((x) => x.id === a) ? a : (profiles[0]?.id ?? null);
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  // localStorage는 동기라 첫 렌더 전에 바로 읽는다
  const [profiles, setProfiles] = useState<Profile[]>(() => load<Profile[]>(KEYS.profiles, []));
  const [activeId, setActiveId] = useState<string | null>(() => initialActiveId(load<Profile[]>(KEYS.profiles, [])));
  const [tickets, setTickets] = useState<SavedTicket[]>(() => load<SavedTicket[]>(KEYS.tickets, []));
  const [draws, setDraws] = useState<Record<number, DrawResult>>(() => load<Record<number, DrawResult>>(KEYS.draws, {}));
  const [settings, setSettings] = useState<Settings>(() => ({ ...DEFAULT_SETTINGS, ...load<Partial<Settings>>(KEYS.settings, {}) }));
  const [todayDream, setTodayDreamState] = useState<DreamKey>(initialDream);

  const activeProfile = profiles.find((p) => p.id === activeId) ?? null;
  const activeChart = useMemo(() => {
    if (!activeProfile) return null;
    try {
      return computeChart(activeProfile);
    } catch {
      return null;
    }
  }, [activeProfile]);

  const setActiveProfile = useCallback((id: string) => {
    setActiveId(id);
    save(KEYS.activeProfileId, id);
  }, []);

  const upsertProfile = useCallback((p: Profile) => {
    setProfiles((prev) => {
      const next = prev.some((x) => x.id === p.id) ? prev.map((x) => (x.id === p.id ? p : x)) : [...prev, p];
      save(KEYS.profiles, next);
      return next;
    });
    setActiveId((cur) => {
      const next = cur ?? p.id;
      save(KEYS.activeProfileId, next);
      return next;
    });
  }, []);

  const deleteProfile = useCallback(
    (id: string) => {
      const next = profiles.filter((x) => x.id !== id);
      setProfiles(next);
      save(KEYS.profiles, next);
      if (activeId === id) {
        const a = next[0]?.id ?? null;
        setActiveId(a);
        save(KEYS.activeProfileId, a);
      }
    },
    [profiles, activeId],
  );

  const addTicket = useCallback((t: SavedTicket) => {
    setTickets((prev) => {
      const next = [t, ...prev];
      save(KEYS.tickets, next);
      return next;
    });
  }, []);

  const removeTicket = useCallback((id: string) => {
    setTickets((prev) => {
      const next = prev.filter((x) => x.id !== id);
      save(KEYS.tickets, next);
      return next;
    });
  }, []);

  const hasTicket = useCallback(
    (round: number, numbers: number[]) =>
      tickets.some((t) => t.round === round && t.numbers.join(',') === numbers.join(',')),
    [tickets],
  );

  const storeDraw = useCallback((d: DrawResult) => {
    setDraws((prev) => {
      const next = { ...prev, [d.round]: d };
      save(KEYS.draws, next);
      return next;
    });
  }, []);

  const loadDraw = useCallback(
    async (round: number) => {
      if (draws[round]) return draws[round];
      const d = await fetchDraw(round, settings.drawApiBase);
      if (d) storeDraw(d);
      return d;
    },
    [draws, settings.drawApiBase, storeDraw],
  );

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      save(KEYS.settings, next);
      return next;
    });
  }, []);

  const setTodayDream = useCallback((d: DreamKey) => {
    setTodayDreamState(d);
    save(KEYS.dream, { date: todayKey(), value: d });
  }, []);

  const resetAll = useCallback(() => {
    clearAll();
    setProfiles([]);
    setActiveId(null);
    setTickets([]);
    setDraws({});
    setSettings(DEFAULT_SETTINGS);
    setTodayDreamState('none');
  }, []);

  const value: AppStateValue = {
    profiles,
    activeProfile,
    activeChart,
    setActiveProfile,
    upsertProfile,
    deleteProfile,
    tickets,
    addTicket,
    removeTicket,
    hasTicket,
    draws,
    loadDraw,
    saveManualDraw: storeDraw,
    settings,
    updateSettings,
    todayDream,
    setTodayDream,
    resetAll,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside AppStateProvider');
  return v;
}

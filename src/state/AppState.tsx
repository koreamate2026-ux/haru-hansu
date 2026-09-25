import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api, type ApiPerson, type ApiPersonInput, type ApiTicket } from '../lib/api';
import { fetchDraw } from '../lib/draws';
import type { DreamKey } from '../lib/luckyNumbers';
import { todayKST } from '../lib/rounds';
import { computeChart, type SajuChart } from '../lib/saju';
import { KEYS, clearAll, load, save } from '../lib/storage';
import type { DrawResult, Profile, SavedTicket, Settings } from '../lib/types';
import { useAuth } from './AuthState';

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

/** 서버의 Person을 앱이 쓰는 Profile 모양으로. 가족 기념일은 서버에 아직 없어서 로컬 값을 그대로 이어받는다 */
function personToProfile(p: ApiPerson, keepFamilyEvents: Profile['familyEvents']): Profile {
  return {
    id: p.id,
    name: p.name,
    calendar: p.calendar,
    leapMonth: p.leapMonth,
    year: p.birthYear,
    month: p.birthMonth,
    day: p.birthDay,
    hour: p.birthHour,
    minute: p.birthMinute,
    bloodType: p.bloodType,
    familyEvents: keepFamilyEvents,
    createdAt: new Date(p.createdAt).getTime(),
  };
}

function profileToPersonInput(p: Profile): ApiPersonInput {
  return {
    name: p.name,
    calendar: p.calendar,
    leapMonth: p.leapMonth,
    birthYear: p.year,
    birthMonth: p.month,
    birthDay: p.day,
    birthHour: p.hour,
    birthMinute: p.minute,
    bloodType: p.bloodType,
  };
}

function apiTicketToLocal(t: ApiTicket): SavedTicket {
  return {
    id: t.id,
    profileId: t.personIds[0] ?? null,
    profileName: t.personNames.join('·') || '가족',
    round: t.round,
    numbers: t.numbers,
    source: t.source,
    category: t.category,
    createdAt: new Date(t.createdAt).getTime(),
  };
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
  /** 로그인 + 가족 그룹을 골라서, 사람·번호함이 서버와 맞춰지고 있는지 */
  synced: boolean;
  resetAll: () => void;
}

const Ctx = createContext<AppStateValue | null>(null);

function initialActiveId(profiles: Profile[]) {
  const a = load<string | null>(KEYS.activeProfileId, null);
  return a && profiles.some((x) => x.id === a) ? a : (profiles[0]?.id ?? null);
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const { account, token, currentHouseholdId } = useAuth();
  const synced = Boolean(account && token && currentHouseholdId);

  // localStorage는 동기라 첫 렌더 전에 바로 읽는다
  const [profiles, setProfiles] = useState<Profile[]>(() => load<Profile[]>(KEYS.profiles, []));
  const [activeId, setActiveId] = useState<string | null>(() => initialActiveId(load<Profile[]>(KEYS.profiles, [])));
  const [tickets, setTickets] = useState<SavedTicket[]>(() => load<SavedTicket[]>(KEYS.tickets, []));
  const [draws, setDraws] = useState<Record<number, DrawResult>>(() => load<Record<number, DrawResult>>(KEYS.draws, {}));
  const [settings, setSettings] = useState<Settings>(() => ({ ...DEFAULT_SETTINGS, ...load<Partial<Settings>>(KEYS.settings, {}) }));
  const [todayDream, setTodayDreamState] = useState<DreamKey>(initialDream);

  const profilesRef = useRef(profiles);
  useEffect(() => {
    profilesRef.current = profiles;
  }, [profiles]);

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

  /** 서버의 사람·번호함으로 로컬을 맞춘다 (서버가 기준). 가족 기념일만 로컬 값을 지킨다 */
  const pullFromServer = useCallback(async () => {
    if (!token || !currentHouseholdId) return;
    try {
      const [serverPersons, serverTickets] = await Promise.all([
        api.listPersons(currentHouseholdId, token),
        api.listTickets(currentHouseholdId, token),
      ]);
      const mapped = serverPersons.map((p) =>
        personToProfile(p, profilesRef.current.find((x) => x.id === p.id)?.familyEvents ?? []),
      );
      setProfiles(mapped);
      save(KEYS.profiles, mapped);
      setActiveId((cur) => {
        const next = cur && mapped.some((p) => p.id === cur) ? cur : (mapped[0]?.id ?? null);
        save(KEYS.activeProfileId, next);
        return next;
      });
      const mappedTickets = serverTickets.map(apiTicketToLocal);
      setTickets(mappedTickets);
      save(KEYS.tickets, mappedTickets);
    } catch {
      // 서버에서 못 받아와도 로컬 데이터로 계속 동작
    }
  }, [token, currentHouseholdId]);

  // 로그인하고 가족 그룹을 고르면(또는 바꾸면) 그 그룹의 사람·번호함으로 맞춘다
  useEffect(() => {
    if (synced) pullFromServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [synced, currentHouseholdId]);

  const upsertProfile = useCallback(
    (p: Profile) => {
      const existed = profilesRef.current.some((x) => x.id === p.id);
      setProfiles((prev) => {
        const next = existed ? prev.map((x) => (x.id === p.id ? p : x)) : [...prev, p];
        save(KEYS.profiles, next);
        return next;
      });
      setActiveId((cur) => {
        const next = cur ?? p.id;
        save(KEYS.activeProfileId, next);
        return next;
      });

      if (synced) {
        const localId = p.id;
        const input = profileToPersonInput(p);
        const call = existed
          ? api.updatePerson(currentHouseholdId!, localId, input, token!)
          : api.createPerson(currentHouseholdId!, input, token!);
        call
          .then((server) => {
            if (server.id === localId) return;
            // 새로 만든 사람은 로컬 임시 id를 서버가 준 진짜 id로 바꿔치기
            setProfiles((prev) => {
              const next = prev.map((x) => (x.id === localId ? { ...x, id: server.id } : x));
              save(KEYS.profiles, next);
              return next;
            });
            setActiveId((cur) => {
              const next = cur === localId ? server.id : cur;
              save(KEYS.activeProfileId, next);
              return next;
            });
          })
          .catch(() => {
            // 서버 저장에 실패해도 이 기기에는 이미 반영돼 있어 계속 쓸 수 있음
          });
      }
    },
    [synced, currentHouseholdId, token],
  );

  const deleteProfile = useCallback(
    (id: string) => {
      const next = profilesRef.current.filter((x) => x.id !== id);
      setProfiles(next);
      save(KEYS.profiles, next);
      setActiveId((cur) => {
        if (cur !== id) return cur;
        const a = next[0]?.id ?? null;
        save(KEYS.activeProfileId, a);
        return a;
      });

      if (synced) {
        api.deletePerson(currentHouseholdId!, id, token!).catch(() => {});
      }
    },
    [synced, currentHouseholdId, token],
  );

  const addTicket = useCallback(
    (t: SavedTicket) => {
      setTickets((prev) => {
        const next = [t, ...prev];
        save(KEYS.tickets, next);
        return next;
      });

      if (synced) {
        const localId = t.id;
        api
          .createTicket(
            currentHouseholdId!,
            {
              category: t.category ?? t.source,
              round: t.round,
              numbers: t.numbers,
              source: t.source,
              personIds: t.profileId ? [t.profileId] : [],
            },
            token!,
          )
          .then((server) => {
            if (server.id === localId) return;
            setTickets((prev) => {
              const next = prev.map((x) => (x.id === localId ? { ...x, id: server.id } : x));
              save(KEYS.tickets, next);
              return next;
            });
          })
          .catch(() => {});
      }
    },
    [synced, currentHouseholdId, token],
  );

  const removeTicket = useCallback(
    (id: string) => {
      setTickets((prev) => {
        const next = prev.filter((x) => x.id !== id);
        save(KEYS.tickets, next);
        return next;
      });
      if (synced) {
        api.deleteTicket(currentHouseholdId!, id, token!).catch(() => {});
      }
    },
    [synced, currentHouseholdId, token],
  );

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
    // 서버와 동기화 중이었다면, 지운 자리에 서버 데이터를 다시 채운다
    if (synced) pullFromServer();
  }, [synced, pullFromServer]);

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
    synced,
    resetAll,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside AppStateProvider');
  return v;
}

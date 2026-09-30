import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, type ApiFavorite, type ApiFavoriteInput } from '../lib/api';
import { KEYS, load, save } from '../lib/storage';
import type { Profile } from '../lib/types';
import { useAuth } from './AuthState';

/** 좋아하는 연예인·위인(계정마다 서버에 저장). 홈에서 궁합 숫자를 볼 사람은 이 기기에서 고른다 */
interface FavoritesValue {
  favorites: ApiFavorite[];
  active: ApiFavorite | null;
  setActive: (id: string) => void;
  add: (input: ApiFavoriteInput) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

const Ctx = createContext<FavoritesValue | null>(null);

export const favoriteAsProfile = (f: ApiFavorite): Profile => ({
  id: f.id,
  name: f.name,
  calendar: f.calendar,
  leapMonth: f.leapMonth,
  year: f.birthYear,
  month: f.birthMonth,
  day: f.birthDay,
  hour: f.birthHour,
  minute: f.birthMinute,
  bloodType: null,
  familyEvents: [],
  createdAt: 0,
});

export function FavoritesStateProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [favorites, setFavorites] = useState<ApiFavorite[]>([]);
  const [activeId, setActiveId] = useState<string | null>(() => load<string | null>(KEYS.favoriteActive, null));

  useEffect(() => {
    if (!token) {
      setFavorites([]);
      return;
    }
    api.listFavorites(token).then(setFavorites, () => setFavorites([]));
  }, [token]);

  const setActive = useCallback((id: string) => {
    setActiveId(id);
    save(KEYS.favoriteActive, id);
  }, []);

  const add = useCallback(
    async (input: ApiFavoriteInput) => {
      if (!token) return;
      const created = await api.createFavorite(input, token);
      setFavorites((prev) => [...prev, created]);
      setActive(created.id);
    },
    [token, setActive],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!token) return;
      await api.deleteFavorite(id, token);
      setFavorites((prev) => prev.filter((f) => f.id !== id));
    },
    [token],
  );

  const active = favorites.find((f) => f.id === activeId) ?? favorites[0] ?? null;

  return <Ctx.Provider value={{ favorites, active, setActive, add, remove }}>{children}</Ctx.Provider>;
}

export function useFavorites() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useFavorites must be used inside FavoritesStateProvider');
  return v;
}

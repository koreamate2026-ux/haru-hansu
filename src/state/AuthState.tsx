import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, type Account, type ApiHousehold } from '../lib/api';
import { KEYS, load, save } from '../lib/storage';

/**
 * 가족과 계정으로 연동하는 기능(선택 사항). 로그인하지 않아도 앱은 지금처럼
 * 이 브라우저에만 저장되는 방식으로 완전히 동작한다. 로그인해서 가족 그룹을
 * 고르면(currentHouseholdId), AppState가 사람·번호함을 그 그룹과 동기화한다.
 */
interface StoredAuth {
  token: string;
  account: Account;
}

interface AuthStateValue {
  account: Account | null;
  token: string | null;
  households: ApiHousehold[];
  currentHouseholdId: string | null;
  setCurrentHousehold: (id: string | null) => void;
  loading: boolean;
  error: string | null;
  signup: (email: string, password: string, displayName: string, phone: string, verifyToken: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  createHousehold: (name: string) => Promise<boolean>;
  clearError: () => void;
}

const Ctx = createContext<AuthStateValue | null>(null);

export function AuthStateProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<StoredAuth | null>(() => load<StoredAuth | null>(KEYS.auth, null));
  const [households, setHouseholds] = useState<ApiHousehold[]>([]);
  const [currentHouseholdId, setCurrentHouseholdId] = useState<string | null>(() => load<string | null>(KEYS.currentHouseholdId, null));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setCurrentHousehold = useCallback((id: string | null) => {
    setCurrentHouseholdId(id);
    save(KEYS.currentHouseholdId, id);
  }, []);

  const refreshHouseholds = useCallback(
    async (token: string) => {
      try {
        const list = await api.myHouseholds(token);
        setHouseholds(list);
        // 고른 그룹이 없거나 더 이상 못 보는 그룹이면, 첫 번째 그룹을 자동으로 고른다
        setCurrentHouseholdId((cur) => {
          if (cur && list.some((h) => h.id === cur)) return cur;
          const next = list[0]?.id ?? null;
          save(KEYS.currentHouseholdId, next);
          return next;
        });
      } catch {
        // 목록을 못 가져와도 로그인 자체는 유지 (일시적인 네트워크 문제일 수 있음)
      }
    },
    [],
  );

  // 새로고침 뒤에도 로그인이 남아 있으면 가족 그룹 목록을 다시 받아온다
  useEffect(() => {
    if (stored) refreshHouseholds(stored.token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runAuth = useCallback(
    async (fn: () => Promise<{ token: string; account: Account }>) => {
      setLoading(true);
      setError(null);
      try {
        const result = await fn();
        setStored(result);
        save(KEYS.auth, result);
        await refreshHouseholds(result.token);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : '알 수 없는 오류가 발생했어요.');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [refreshHouseholds],
  );

  const signup = useCallback(
    (email: string, password: string, displayName: string, phone: string, verifyToken: string) =>
      runAuth(() => api.signup(email, password, displayName, phone, verifyToken)),
    [runAuth],
  );

  const login = useCallback((email: string, password: string) => runAuth(() => api.login(email, password)), [runAuth]);

  const logout = useCallback(() => {
    setStored(null);
    setHouseholds([]);
    setCurrentHousehold(null);
    save(KEYS.auth, null);
  }, [setCurrentHousehold]);

  const createHousehold = useCallback(
    async (name: string) => {
      if (!stored) return false;
      setLoading(true);
      setError(null);
      try {
        const created = await api.createHousehold(name, stored.token);
        await refreshHouseholds(stored.token);
        setCurrentHousehold(created.id);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : '알 수 없는 오류가 발생했어요.');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [stored, refreshHouseholds, setCurrentHousehold],
  );

  const value: AuthStateValue = {
    account: stored?.account ?? null,
    token: stored?.token ?? null,
    households,
    currentHouseholdId,
    setCurrentHousehold,
    loading,
    error,
    signup,
    login,
    logout,
    createHousehold,
    clearError: () => setError(null),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthStateProvider');
  return v;
}

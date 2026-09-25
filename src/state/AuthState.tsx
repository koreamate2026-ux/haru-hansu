import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, type Account, type ApiHousehold } from '../lib/api';
import { KEYS, load, save } from '../lib/storage';

/**
 * 가족과 계정으로 연동하는 기능(선택 사항). 로그인하지 않아도 앱은 지금처럼
 * 이 브라우저에만 저장되는 방식으로 완전히 동작한다. 로그인하면 서버의
 * 가족 그룹(Household)을 만들거나 볼 수 있다 — 사람·번호함 동기화는 다음 단계.
 */
interface StoredAuth {
  token: string;
  account: Account;
}

interface AuthStateValue {
  account: Account | null;
  households: ApiHousehold[];
  loading: boolean;
  error: string | null;
  signup: (email: string, password: string, displayName: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  createHousehold: (name: string) => Promise<boolean>;
  clearError: () => void;
}

const Ctx = createContext<AuthStateValue | null>(null);

export function AuthStateProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<StoredAuth | null>(() => load<StoredAuth | null>(KEYS.auth, null));
  const [households, setHouseholds] = useState<ApiHousehold[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshHouseholds = useCallback(async (token: string) => {
    try {
      setHouseholds(await api.myHouseholds(token));
    } catch {
      // 목록을 못 가져와도 로그인 자체는 유지 (일시적인 네트워크 문제일 수 있음)
    }
  }, []);

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
    (email: string, password: string, displayName: string) => runAuth(() => api.signup(email, password, displayName)),
    [runAuth],
  );

  const login = useCallback((email: string, password: string) => runAuth(() => api.login(email, password)), [runAuth]);

  const logout = useCallback(() => {
    setStored(null);
    setHouseholds([]);
    save(KEYS.auth, null);
  }, []);

  const createHousehold = useCallback(
    async (name: string) => {
      if (!stored) return false;
      setLoading(true);
      setError(null);
      try {
        await api.createHousehold(name, stored.token);
        await refreshHouseholds(stored.token);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : '알 수 없는 오류가 발생했어요.');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [stored, refreshHouseholds],
  );

  const value: AuthStateValue = {
    account: stored?.account ?? null,
    households,
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

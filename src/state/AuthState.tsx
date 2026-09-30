import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { api, type Account, type ApiHousehold } from '../lib/api';
import { KEYS, load, save } from '../lib/storage';

/**
 * 가족 계정 로그인 상태. App.tsx의 TabsLayout이 로그인 여부를 게이트로 걸어
 * 두어서, 계정 없이는 탭 화면(홈/사주/번호함/설정)에 들어올 수 없다. 로그인해서
 * 가족 그룹을 고르면(currentHouseholdId), AppState가 사람·번호함을 그 그룹과 동기화한다.
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
  /** 가족 그룹 목록을 서버에서 다시 받아온다(참여·나가기 뒤) */
  reloadHouseholds: () => Promise<void>;
  clearError: () => void;
}

const Ctx = createContext<AuthStateValue | null>(null);

export function AuthStateProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<StoredAuth | null>(() => load<StoredAuth | null>(KEYS.auth, null));
  // signup() 직후 같은 함수 안에서 바로 createHousehold()를 부르는 경우, setStored로 예약된
  // 상태가 아직 리렌더에 반영되지 않아 stored가 그대로 null로 보이는 문제가 있어 ref로 최신값을 유지한다
  const storedRef = useRef(stored);
  storedRef.current = stored;
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
        storedRef.current = result;
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
      const current = storedRef.current;
      if (!current) return false;
      setLoading(true);
      setError(null);
      try {
        const created = await api.createHousehold(name, current.token);
        await refreshHouseholds(current.token);
        setCurrentHousehold(created.id);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : '알 수 없는 오류가 발생했어요.');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [refreshHouseholds, setCurrentHousehold],
  );

  const reloadHouseholds = useCallback(async () => {
    if (storedRef.current) await refreshHouseholds(storedRef.current.token);
  }, [refreshHouseholds]);

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
    reloadHouseholds,
    clearError: () => setError(null),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthStateProvider');
  return v;
}

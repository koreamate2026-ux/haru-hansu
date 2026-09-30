import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, type BillingStatus } from '../lib/api';
import { useAuth } from './AuthState';

/** 무료 계정이 한 가족 그룹에 등록할 수 있는 사람 수(본인 포함). 서버 billing.ts와 같은 값 */
export const FREE_PERSON_LIMIT = 2;

interface BillingValue {
  /** 서버에서 구독 상태를 한 번이라도 받아왔는지(광고 팝업을 띄울지 판단할 때 씀) */
  loaded: boolean;
  premium: boolean;
  status: BillingStatus | null;
  refresh: () => Promise<void>;
  setStatus: (s: BillingStatus) => void;
}

const Ctx = createContext<BillingValue | null>(null);

export function BillingStateProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) {
      setStatus(null);
      setLoaded(true);
      return;
    }
    try {
      setStatus(await api.billingStatus(token));
    } catch {
      // 조회에 실패하면 무료로 보고 계속 쓰게 한다
    } finally {
      setLoaded(true);
    }
  }, [token]);

  useEffect(() => {
    setLoaded(false);
    void refresh();
  }, [refresh]);

  return (
    <Ctx.Provider value={{ loaded, premium: Boolean(status?.premium), status, refresh, setStatus }}>{children}</Ctx.Provider>
  );
}

export function useBilling() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useBilling must be used inside BillingStateProvider');
  return v;
}

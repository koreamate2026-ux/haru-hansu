/**
 * 하루 한수 API 서버 호출. 서버 코드는 ../../server, 배포는 server/README.md 참고.
 * VITE_API_BASE가 없으면 '/api'로 호출한다 (dev 서버의 프록시나, 같은 도메인에 배포됐을 때를 가정).
 */
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) || '/api';

export class ApiError extends Error {}

async function request<T>(path: string, opts: RequestInit = {}, token?: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...opts.headers,
      },
    });
  } catch {
    throw new ApiError('서버에 연결할 수 없어요. 인터넷 연결을 확인해 주세요.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || '요청이 실패했어요.');
  return data as T;
}

export interface Account {
  id: string;
  email: string;
  displayName: string;
}

export interface AuthResult {
  token: string;
  account: Account;
}

export interface ApiHousehold {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  role?: 'owner' | 'member';
}

export const api = {
  signup: (email: string, password: string, displayName: string) =>
    request<AuthResult>('/auth/signup', { method: 'POST', body: JSON.stringify({ email, password, displayName }) }),

  login: (email: string, password: string) =>
    request<AuthResult>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  myHouseholds: (token: string) => request<ApiHousehold[]>('/households/mine', {}, token),

  createHousehold: (name: string, token: string) =>
    request<ApiHousehold>('/households', { method: 'POST', body: JSON.stringify({ name }) }, token),
};

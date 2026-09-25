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

export interface ApiPerson {
  id: string;
  householdId: string;
  name: string;
  calendar: 'solar' | 'lunar';
  leapMonth: boolean;
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthHour: number | null;
  birthMinute: number;
  bloodType: 'A' | 'B' | 'O' | 'AB' | null;
  createdAt: string;
  updatedAt: string;
}

export type ApiPersonInput = Omit<ApiPerson, 'id' | 'householdId' | 'createdAt' | 'updatedAt'>;

export interface ApiTicket {
  id: string;
  category: string;
  round: number;
  numbers: number[];
  source: 'saju' | 'manual';
  createdAt: string;
  personIds: string[];
  personNames: string[];
}

export const api = {
  signup: (email: string, password: string, displayName: string) =>
    request<AuthResult>('/auth/signup', { method: 'POST', body: JSON.stringify({ email, password, displayName }) }),

  login: (email: string, password: string) =>
    request<AuthResult>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  myHouseholds: (token: string) => request<ApiHousehold[]>('/households/mine', {}, token),

  createHousehold: (name: string, token: string) =>
    request<ApiHousehold>('/households', { method: 'POST', body: JSON.stringify({ name }) }, token),

  listPersons: (householdId: string, token: string) => request<ApiPerson[]>(`/households/${householdId}/persons`, {}, token),

  createPerson: (householdId: string, data: ApiPersonInput, token: string) =>
    request<ApiPerson>(`/households/${householdId}/persons`, { method: 'POST', body: JSON.stringify(data) }, token),

  updatePerson: (householdId: string, personId: string, data: Partial<ApiPersonInput>, token: string) =>
    request<ApiPerson>(`/households/${householdId}/persons/${personId}`, { method: 'PATCH', body: JSON.stringify(data) }, token),

  deletePerson: (householdId: string, personId: string, token: string) =>
    request<void>(`/households/${householdId}/persons/${personId}`, { method: 'DELETE' }, token),

  listTickets: (householdId: string, token: string) => request<ApiTicket[]>(`/households/${householdId}/tickets`, {}, token),

  createTicket: (
    householdId: string,
    data: { category: string; round: number; numbers: number[]; source: 'saju' | 'manual'; personIds: string[] },
    token: string,
  ) => request<ApiTicket>(`/households/${householdId}/tickets`, { method: 'POST', body: JSON.stringify(data) }, token),

  deleteTicket: (householdId: string, ticketId: string, token: string) =>
    request<void>(`/households/${householdId}/tickets/${ticketId}`, { method: 'DELETE' }, token),
};

/**
 * 하루 한수 API 서버 호출. 서버 코드는 ../../server, 배포는 server/README.md 참고.
 * VITE_API_BASE가 없으면 '/api'로 호출한다 (dev 서버의 프록시나, 같은 도메인에 배포됐을 때를 가정).
 */
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) || '/api';

export class ApiError extends Error {
  constructor(
    message: string,
    /** 서버가 알려준 오류 종류(예: FAMILY_LIMIT) */
    public code?: string,
  ) {
    super(message);
  }
}

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
  if (!res.ok) throw new ApiError(data.error || '요청이 실패했어요.', data.code);
  return data as T;
}

export interface Account {
  id: string;
  /** 로그인 아이디 */
  username?: string;
  /** 예전 응답 호환용(지금은 아이디와 같은 값) */
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
  /** 그룹을 만든 사람이 플러스라서 인원 제한이 없는지 */
  plus?: boolean;
  /** 그룹에 등록된 사람(/households/mine 응답에 함께 옴) */
  persons?: { id: string }[];
}

export interface ApiFamilyEvent {
  label: string;
  month: number;
  day: number;
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
  gender: 'M' | 'F' | null;
  familyEvents: ApiFamilyEvent[];
  /** 가족 연동: 이 사람이 그룹의 어느 계정 본인인지 */
  linkedAccountId?: string | null;
  createdByAccountId?: string | null;
  /** 연동된 본인이 사주를 가족과 함께 볼지(null = 아직 안 정함) */
  shareSaju?: boolean | null;
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
  requestPhoneOtp: (phone: string) =>
    request<{ ok: true; devCode?: string }>('/auth/phone/request', { method: 'POST', body: JSON.stringify({ phone }) }),

  verifyPhoneOtp: (phone: string, code: string) =>
    request<{ verifyToken: string }>('/auth/phone/verify', { method: 'POST', body: JSON.stringify({ phone, code }) }),

  signup: (username: string, password: string, displayName: string, phone: string, verifyToken: string) =>
    request<AuthResult>('/auth/signup', { method: 'POST', body: JSON.stringify({ username, password, displayName, phone, verifyToken }) }),

  checkId: (id: string) => request<{ ok: boolean; reason?: string }>(`/auth/check-id?id=${encodeURIComponent(id)}`),

  login: (id: string, password: string) => request<AuthResult>('/auth/login', { method: 'POST', body: JSON.stringify({ id, password }) }),

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

  createInvite: (householdId: string, personId: string | null, token: string) =>
    request<{ id: string; code: string; expiresAt: string; personId: string | null }>(
      `/households/${householdId}/invites`,
      { method: 'POST', body: JSON.stringify({ personId }) },
      token,
    ),

  listInvites: (householdId: string, token: string) => request<ApiInvite[]>(`/households/${householdId}/invites`, {}, token),

  cancelInvite: (householdId: string, inviteId: string, token: string) =>
    request<void>(`/households/${householdId}/invites/${inviteId}`, { method: 'DELETE' }, token),

  invitePreview: (code: string, token: string) => request<ApiInvitePreview>(`/households/invites/${encodeURIComponent(code)}`, {}, token),

  joinHousehold: (code: string, token: string) =>
    request<{ id: string; name: string; invitedPersonId: string | null }>('/households/join', { method: 'POST', body: JSON.stringify({ code }) }, token),

  linkPerson: (householdId: string, personId: string, token: string) =>
    request<void>(`/households/${householdId}/persons/${personId}/link`, { method: 'POST' }, token),

  setSajuShare: (householdId: string, personId: string, share: boolean, token: string) =>
    request<void>(`/households/${householdId}/persons/${personId}/share`, { method: 'PATCH', body: JSON.stringify({ share }) }, token),

  unlinkPerson: (householdId: string, personId: string, token: string) =>
    request<void>(`/households/${householdId}/persons/${personId}/link`, { method: 'DELETE' }, token),

  listRelations: (householdId: string, token: string) =>
    request<{ fromPersonId: string; toPersonId: string; rel: string }[]>(`/households/${householdId}/relations`, {}, token),

  putRelation: (householdId: string, fromPersonId: string, toPersonId: string, rel: string | null, token: string) =>
    request<void>(`/households/${householdId}/relations`, { method: 'PUT', body: JSON.stringify({ fromPersonId, toPersonId, rel }) }, token),

  householdSettings: (householdId: string, token: string) => request<{ trueSolarTime: boolean }>(`/households/${householdId}/settings`, {}, token),

  updateHouseholdSettings: (householdId: string, data: { trueSolarTime: boolean }, token: string) =>
    request<{ trueSolarTime: boolean }>(`/households/${householdId}/settings`, { method: 'PATCH', body: JSON.stringify(data) }, token),

  importHousehold: (householdId: string, fromHouseholdId: string, token: string) =>
    request<{ persons: number; merged: number; tickets: number }>(
      `/households/${householdId}/import`,
      { method: 'POST', body: JSON.stringify({ fromHouseholdId }) },
      token,
    ),

  householdMembers: (householdId: string, token: string) => request<ApiMember[]>(`/households/${householdId}/members`, {}, token),

  removeMember: (householdId: string, accountId: string, token: string) =>
    request<void>(`/households/${householdId}/members/${accountId}`, { method: 'DELETE' }, token),

  deleteAccount: (password: string, token: string) =>
    request<void>('/auth/me', { method: 'DELETE', body: JSON.stringify({ password }) }, token),

  listFavorites: (token: string) => request<ApiFavorite[]>('/favorites', {}, token),

  createFavorite: (data: ApiFavoriteInput, token: string) =>
    request<ApiFavorite>('/favorites', { method: 'POST', body: JSON.stringify(data) }, token),

  deleteFavorite: (id: string, token: string) => request<void>(`/favorites/${id}`, { method: 'DELETE' }, token),

  billingStatus: (token: string) => request<BillingStatus>('/billing/me', {}, token),

  billingCheckout: (plan: PlanId, token: string) =>
    request<BillingCheckout>('/billing/checkout', { method: 'POST', body: JSON.stringify({ plan }) }, token),

  billingConfirm: (data: { authKey: string; customerKey: string; plan: PlanId }, token: string) =>
    request<BillingStatus>('/billing/confirm', { method: 'POST', body: JSON.stringify(data) }, token),

  billingCancel: (token: string) => request<BillingStatus>('/billing/cancel', { method: 'POST' }, token),

  billingResume: (token: string) => request<BillingStatus>('/billing/resume', { method: 'POST' }, token),

  billingChangePlan: (plan: PlanId, token: string) =>
    request<BillingStatus>('/billing/plan', { method: 'POST', body: JSON.stringify({ plan }) }, token),

  billingRefund: (token: string) => request<BillingStatus & { refunded: number }>('/billing/refund', { method: 'POST' }, token),
};

export type PlanId = 'monthly' | 'yearly';

export interface ApiFavorite {
  id: string;
  name: string;
  kind: 'historical' | 'custom';
  historicalKey: string | null;
  calendar: 'solar' | 'lunar';
  leapMonth: boolean;
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthHour: number | null;
  birthMinute: number;
  createdAt: string;
}

export type ApiFavoriteInput = Omit<ApiFavorite, 'id' | 'createdAt'>;

export interface ApiInvite {
  id: string;
  code: string;
  personId: string | null;
  personName: string | null;
  status: 'active' | 'used' | 'expired';
  usedByName: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface ApiInvitePreview {
  householdId: string;
  householdName: string;
  ownerName: string;
  personName: string | null;
  status: 'active' | 'used' | 'expired';
  alreadyMember: boolean;
}

export interface ApiMember {
  accountId: string;
  displayName: string;
  linkedPersonId: string | null;
  linkedPersonName: string | null;
  /** 연동된 사람의 사주 공유 여부(null = 아직 안 정함) */
  sajuShared: boolean | null;
  role: 'owner' | 'member';
  joinedAt: string;
  isMe: boolean;
}

export interface BillingStatus {
  enabled: boolean;
  premium: boolean;
  plan: PlanId | null;
  /** 다음 결제부터 바뀔 요금제 */
  nextPlan: PlanId | null;
  status: 'pending' | 'active' | 'past_due' | 'expired' | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  refund: { refundable: boolean; amount: number; reason: string };
  freePersonLimit: number;
  plans: Record<PlanId, { amount: number; months: number }>;
}

export interface BillingCheckout {
  clientKey: string;
  customerKey: string;
  customerEmail: string;
  customerName: string;
}

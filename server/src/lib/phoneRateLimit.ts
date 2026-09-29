/**
 * 휴대폰 인증번호 "받기" 남용 방지. 같은 번호로 3번 연속 받으면 그 다음 요청부터
 * 막고 대기 시간을 두며(15분 → 1시간), 그 다음 단계에서 또 3번 채우면 완전히
 * 막아서 관리자에게 문의하도록 한다. 서버 재시작하면 비워진다(otpStore.ts와 동일 전제).
 */
interface Entry {
  tier: 0 | 1 | 2;
  count: number;
  blockedUntil: number | null;
  permanentlyBlocked: boolean;
}

const MAX_PER_TIER = 3;
const COOLDOWNS_MS = [15 * 60 * 1000, 60 * 60 * 1000] as const; // tier 0→1, tier 1→2

const store = new Map<string, Entry>();

export type PhoneRateLimitResult = { ok: true } | { ok: false; permanent: true } | { ok: false; permanent: false; retryAt: number };

export function checkPhoneRateLimit(phone: string): PhoneRateLimitResult {
  const now = Date.now();
  const entry = store.get(phone) ?? { tier: 0, count: 0, blockedUntil: null, permanentlyBlocked: false };

  if (entry.permanentlyBlocked) return { ok: false, permanent: true };

  if (entry.blockedUntil !== null) {
    if (now < entry.blockedUntil) return { ok: false, permanent: false, retryAt: entry.blockedUntil };
    entry.blockedUntil = null; // 대기 시간 끝 — 다음 단계 새로 카운트 시작
  }

  if (entry.count >= MAX_PER_TIER) {
    if (entry.tier === 2) {
      entry.permanentlyBlocked = true;
      store.set(phone, entry);
      return { ok: false, permanent: true };
    }
    const nextTier = (entry.tier + 1) as 1 | 2;
    entry.tier = nextTier;
    entry.count = 0;
    entry.blockedUntil = now + COOLDOWNS_MS[entry.tier - 1];
    store.set(phone, entry);
    return { ok: false, permanent: false, retryAt: entry.blockedUntil };
  }

  entry.count += 1;
  store.set(phone, entry);
  return { ok: true };
}

/** 인증에 성공하면(진짜 본인 번호로 확인됨) 그동안 쌓인 제한을 풀어 준다 */
export function resetPhoneRateLimit(phone: string): void {
  store.delete(phone);
}

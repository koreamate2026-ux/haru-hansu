/**
 * 휴대폰 인증번호를 잠깐 담아 두는 메모리 저장소. 서버가 재시작되면 비워지는데,
 * 어차피 인증번호는 몇 분짜리 임시값이라 문제없다. 여러 대의 API 서버를 두게 되면
 * (지금은 1대) Redis 같은 공유 저장소로 바꿔야 한다.
 */
interface Entry {
  code: string;
  expiresAt: number;
  attempts: number;
}

const store = new Map<string, Entry>();
const TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function cleanup() {
  const now = Date.now();
  for (const [phone, e] of store) if (e.expiresAt < now) store.delete(phone);
}

export function issueOtp(phone: string): string {
  cleanup();
  const code = String(Math.floor(100000 + Math.random() * 900000));
  store.set(phone, { code, expiresAt: Date.now() + TTL_MS, attempts: 0 });
  return code;
}

export function verifyOtp(phone: string, code: string): { ok: boolean; error?: string } {
  const entry = store.get(phone);
  if (!entry) return { ok: false, error: '인증번호를 먼저 받아 주세요.' };
  if (entry.expiresAt < Date.now()) {
    store.delete(phone);
    return { ok: false, error: '인증번호 유효 시간이 지났어요. 다시 받아 주세요.' };
  }
  entry.attempts += 1;
  if (entry.attempts > MAX_ATTEMPTS) {
    store.delete(phone);
    return { ok: false, error: '너무 여러 번 틀렸어요. 인증번호를 다시 받아 주세요.' };
  }
  if (entry.code !== code) return { ok: false, error: '인증번호가 올바르지 않아요.' };
  store.delete(phone);
  return { ok: true };
}

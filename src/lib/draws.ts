import type { DrawResult } from './types';

/**
 * 브라우저에서는 CORS 때문에 동행복권 주소를 직접 부를 수 없어요.
 * 개발·미리보기 서버(vite)는 /dhlottery 경로를 동행복권으로 중계하고,
 * 배포할 때는 빌드 환경변수 VITE_DRAW_API에 중계 서버 주소를 넣어요.
 */
export const DEFAULT_DRAW_API: string =
  import.meta.env?.VITE_DRAW_API || '/dhlottery/common.do?method=getLottoNumber&drwNo=';

/**
 * 회차별 당첨번호 조회.
 * 동행복권의 비공개 JSON 주소는 공식 API가 아니어서 차단·변경될 수 있어요.
 * 설정에서 직접 운영하는 중계 서버 주소(…?drwNo= 로 끝나는 주소)로 바꿀 수 있고,
 * 응답은 동행복권과 같은 형식(drwtNo1~6, bnusNo, drwNoDate, returnValue)이면 됩니다.
 * 조회에 실패하면 앱에서 당첨번호를 직접 입력할 수 있어요.
 */
export async function fetchDraw(round: number, apiBase?: string): Promise<DrawResult | null> {
  const base = apiBase?.trim() || DEFAULT_DRAW_API;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${base}${round}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const text = await res.text();
    const json = JSON.parse(text);
    if (json.returnValue !== 'success') return null;
    const numbers = [1, 2, 3, 4, 5, 6].map((i) => Number(json[`drwtNo${i}`]));
    const bonus = Number(json.bnusNo);
    if (numbers.some((n) => !(n >= 1 && n <= 45)) || !(bonus >= 1 && bonus <= 45)) return null;
    return { round, date: String(json.drwNoDate ?? ''), numbers: numbers.sort((a, b) => a - b), bonus, source: 'api' };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

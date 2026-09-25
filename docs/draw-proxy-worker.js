/**
 * 당첨번호 중계 서버 예시 (Cloudflare Workers)
 *
 * 왜 필요한가: 앱이 동행복권 주소를 직접 호출하면 차단되거나 형식이 바뀔 때 모든 사용자가
 * 앱 업데이트 전까지 결과를 못 봅니다. 중계 서버를 두면 서버만 고치면 됩니다.
 *
 * 배포: npx wrangler deploy draw-proxy-worker.js --name ohaengsu-draw
 * 앱 설정의 "당첨번호 조회 주소"에  https://ohaengsu-draw.<계정>.workers.dev/?drwNo=  입력
 *
 * 웹 버전은 브라우저에서 호출하므로 CORS 헤더(Access-Control-Allow-Origin)를 붙입니다.
 * 웹 앱을 빌드할 때 VITE_DRAW_API=https://ohaengsu-draw.<계정>.workers.dev/?drwNo= 로 지정하세요.
 *
 * 응답 형식은 동행복권과 같게 유지합니다 (returnValue, drwNoDate, drwtNo1~6, bnusNo).
 * 원본 주소가 막히면 fetchUpstream 부분만 다른 데이터 출처(직접 입력한 KV 등)로 바꾸면 됩니다.
 */
const CORS = { 'Access-Control-Allow-Origin': '*' };
const UPSTREAM = 'https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=';

async function fetchUpstream(round) {
  const res = await fetch(UPSTREAM + round, {
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
    cf: { cacheTtl: 3600 },
  });
  if (!res.ok) return null;
  try {
    const json = JSON.parse(await res.text());
    return json.returnValue === 'success' ? json : null;
  } catch {
    return null;
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const round = Number(url.searchParams.get('drwNo'));
    if (!Number.isInteger(round) || round < 1) {
      return Response.json({ returnValue: 'fail', reason: 'drwNo가 필요해요' }, { status: 400, headers: CORS });
    }

    // 이미 추첨이 끝난 회차 결과는 바뀌지 않으므로 오래 캐시
    const cache = caches.default;
    const cacheKey = new Request(`https://cache.ohaengsu/draw/${round}`);
    const hit = await cache.match(cacheKey);
    if (hit) return hit;

    const data = await fetchUpstream(round);
    if (!data) return Response.json({ returnValue: 'fail' }, { status: 502, headers: CORS });

    const body = {
      returnValue: 'success',
      drwNo: round,
      drwNoDate: data.drwNoDate,
      drwtNo1: data.drwtNo1,
      drwtNo2: data.drwtNo2,
      drwtNo3: data.drwtNo3,
      drwtNo4: data.drwtNo4,
      drwtNo5: data.drwtNo5,
      drwtNo6: data.drwtNo6,
      bnusNo: data.bnusNo,
    };
    const response = Response.json(body, { headers: { 'Cache-Control': 'public, max-age=86400', ...CORS } });
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  },
};

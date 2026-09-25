import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// 브라우저는 CORS 때문에 동행복권 주소를 직접 부를 수 없어서, 개발·미리보기 서버에서 중계한다.
// 배포할 때는 docs/draw-proxy-worker.js 같은 중계 서버 주소를 VITE_DRAW_API로 넣는다.
const dhlottery = {
  '/dhlottery': {
    target: 'https://www.dhlottery.co.kr',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/dhlottery/, ''),
    headers: { 'User-Agent': 'Mozilla/5.0' },
  },
};

// 하루 한수 API 서버(server/). 로컬에서 테스트할 때는
// `ssh -L 8095:127.0.0.1:8095 root@<VPS_IP> -N` 로 터널을 띄워 두면
// 이 프록시가 그 터널을 통해 VPS의 API를 그대로 호출한다.
const api = {
  '/api': {
    target: 'http://127.0.0.1:8095',
    changeOrigin: true,
  },
};

export default defineConfig({
  plugins: [react()],
  base: './',
  server: { proxy: { ...dhlottery, ...api } },
  preview: { proxy: { ...dhlottery, ...api } },
  // lunar-javascript(만세력 데이터)가 커서 번들이 600KB 정도 돼요
  build: { chunkSizeWarningLimit: 800 },
});

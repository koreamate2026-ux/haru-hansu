import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

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
  server: { proxy: { ...api } },
  preview: { proxy: { ...api } },
  // lunar-javascript(만세력 데이터)가 커서 번들이 600KB 정도 돼요
  build: { chunkSizeWarningLimit: 800 },
});

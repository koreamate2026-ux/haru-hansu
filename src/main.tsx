import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import { isNativeApp } from './lib/platform';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// 홈 화면에 앱처럼 설치할 수 있게 서비스 워커를 등록한다(배포 버전에서만)
// 앱 안에서는 필요 없다(화면이 이미 휴대폰에 들어 있음)
if (import.meta.env.PROD && !isNativeApp && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

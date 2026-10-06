// 홈 화면 설치용 최소 서비스 워커. 화면을 캐시하지 않아서 배포하면 바로 새 버전이 보인다
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});

# 하루 한수 API 서버

`../src/lib` 아래 계산 로직(saju·lotto·luckyNumbers)은 아직 옮기지 않았고, 지금은 **가족 계정
공유의 뼈대**(회원가입·로그인·가족 그룹·사람 등록)만 있습니다. 사주 계산·번호 추천 API, 번호함
동기화는 다음 단계입니다.

## 로컬 개발

```bash
npm install
cp .env.example .env   # POSTGRES_PASSWORD, JWT_SECRET을 실제 값으로 채우기
npx prisma generate
npx prisma db push     # 로컬 Postgres에 스키마 반영
npm run dev            # http://localhost:8095
```

## API

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/health` | 상태 확인 |
| POST | `/api/auth/signup` | `{ email, password, displayName }` |
| POST | `/api/auth/login` | `{ email, password }` → `{ token, account }` |
| POST | `/api/households` | (로그인 필요) `{ name }` — 만들면 본인이 owner로 자동 가입 |
| GET | `/api/households/mine` | 내가 속한 가족 그룹 목록 |
| GET/POST | `/api/households/:id/persons` | 그 그룹의 사람 목록 조회·추가 |
| PATCH/DELETE | `/api/households/:id/persons/:personId` | 사람 정보 수정·삭제 |

모든 `/api/households*` 요청은 `Authorization: Bearer <token>` 헤더가 필요합니다.

## VPS 배포 (Docker, 다른 서비스와 완전히 분리)

```bash
# 로컬에서: 코드를 VPS로 복사
rsync -avz --exclude node_modules --exclude dist . root@<VPS_IP>:/opt/haru-hansu/server/

# VPS에서: /opt/haru-hansu/server 안에서
cp .env.example .env   # 값 채우기 (POSTGRES_PASSWORD, JWT_SECRET는 openssl rand -hex 32)
docker compose up -d --build
docker compose logs -f api   # 정상 기동 확인
curl 127.0.0.1:8095/api/health
```

컨테이너 이름(`haruhansu-*`)과 네트워크(`haruhansu_default`), 볼륨(`haruhansu_pgdata`)을 모두
접두사로 구분해서, 같은 VPS의 다른 프로젝트(wyd-backend, hansfamily, jugyeongyadok 등)와 겹치지
않습니다. Postgres는 호스트 포트를 열지 않고 컨테이너 안에서만 접속되며, API는
`127.0.0.1:8095`에만 붙어 있어 외부에서 직접 접근할 수 없습니다.

## 공개 주소 (도메인 없이 바로 발급)

도메인을 따로 사지 않고 [sslip.io](https://sslip.io)로 VPS IP에 연결되는 진짜 주소를 만들었습니다.

```
https://haruhansu.31-97-71-87.sslip.io
```

- nginx 사이트 블록: `/etc/nginx/sites-available/haruhansu-api` (`127.0.0.1:8095`로 리버스 프록시)
- 인증서: Let's Encrypt (`certbot --nginx`), 자동 갱신 등록됨, 만료일 2026-12-24
- CORS: `.env`의 `CORS_ORIGIN`에 허용할 origin을 쉼표로 나열 (`*.vercel.app`처럼 와일드카드 가능).
  지금은 `https://haru-hansu.vercel.app,*.vercel.app,http://localhost:5173`로 설정돼 있어요.

나중에 진짜 도메인을 사면, 그 도메인으로 `certbot --nginx -d <도메인>`을 한 번 더 실행하고
nginx 설정의 `server_name`만 바꾸면 됩니다.

## Vercel(프런트엔드)에서 이 API 쓰기

Vercel 프로젝트 설정 → Environment Variables에 아래를 추가하고 다시 배포하세요.

```
VITE_API_BASE=https://haruhansu.31-97-71-87.sslip.io/api
```

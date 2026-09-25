# 하루 한수 웹 — React 버전

`../ohaengsu`(Expo 앱)를 브라우저용 React(Vite + TypeScript)로 옮긴 버전입니다. 화면·문구·계산 결과는 앱과 같고, 모든 계산은 브라우저 안에서 이뤄집니다.

## 실행

```bash
npm install
npm test          # 만세력·추천·등수 판정 로직 검증 (앱과 같은 스크립트)
npm run dev       # http://localhost:5173
npm run build     # dist/ 에 정적 파일 생성
```

## 앱과 달라진 점

| 앱(Expo) | 웹 |
|---|---|
| Expo Router | react-router-dom `HashRouter` (정적 호스팅에 서버 설정 없이 배포 가능) |
| AsyncStorage | localStorage (`ohaengsu:` 접두사, 같은 키 구조) |
| 토요일 알림 2종 | 없음. 웹은 예약 알림을 믿을 만하게 보낼 수 없어서 설정에서 뺐어요 |
| 햅틱 피드백 | `navigator.vibrate` + 짧은 안내 문구 |
| 번호 길게 눌러 지우기 | 번호마다 "지우기" 버튼 |
| Alert | `window.confirm` / `window.alert` |

`src/lib/`의 계산 로직(saju·lotto·fortune·elements·rounds·koreaTime·random)은 앱 코드를 그대로 가져왔어요. 달라진 파일은 `storage.ts`(localStorage), `draws.ts`(기본 조회 주소), `types.ts`(알림 설정 제거)뿐입니다.

## 홈 화면 — 오늘의 숫자

홈 탭은 사주 기반 단일 추천 대신, 열한 가지 근거(띠·오행·**가족 궁합**·별자리·혈액형·탄생석·꿈 해몽·가족 기념일·이름·오늘 날짜·전통 길수)로 각각 6개씩 숫자를 뽑아 그림 타일로 보여줘요. 로직은 `src/lib/luckyNumbers.ts`에 있고, 이름·생년월일시·오늘 날짜·(있다면) 혈액형·가족 기념일을 씨앗으로 써서 같은 날에는 같은 숫자, 날이 바뀌면 다른 숫자가 나와요. 혈액형·가족 기념일·꿈은 선택 정보라 안 넣으면 해당 타일에 "정보 필요"가 뜨고, 넣으면 [태어난 날 입력](src/pages/Profile.tsx) 화면에서 언제든 채우거나 바꿀 수 있어요.

**가족 궁합 숫자**는 등록된 사람이 2명 이상일 때만 나와요. 모두의 오행 개수를 더해 다 함께 가장 부족한 기운을 찾고, 등록된 사람마다 자신에게 필요한 기운(용신)이 번호에 하나씩은 들어가도록 채워요.

## 당첨번호 조회

브라우저는 CORS 때문에 동행복권 주소를 직접 부를 수 없어요.

- 개발(`npm run dev`)·미리보기(`npm run preview`) 서버는 `/dhlottery` 경로를 동행복권으로 중계해요 (`vite.config.ts`).
- 배포할 때는 `docs/draw-proxy-worker.js`(앱 예시에 CORS 헤더를 추가한 버전)를 Cloudflare Workers에 올리고, 빌드할 때 주소를 넣으세요.

  ```bash
  VITE_DRAW_API="https://ohaengsu-draw.<계정>.workers.dev/?drwNo=" npm run build
  ```

- 사용자는 설정에서 조회 주소를 직접 바꿀 수도 있어요.

> 2026-09 기준 동행복권의 `common.do?method=getLottoNumber` 주소는 모든 회차에서 홈페이지로 리다이렉트돼요. 이 주소로는 조회가 되지 않으므로 번호함에서 "직접 입력"을 쓰거나, 중계 서버의 `fetchUpstream`을 새 데이터 출처로 바꿔야 해요. 앱 버전도 같은 영향을 받아요.

## 폴더 구조

```
src/
  main.tsx, App.tsx     진입점, 라우팅 (탭 4개 + 첫 화면·정보 입력·번호 저장·당첨번호 입력·설명)
  pages/                화면 하나 = 파일 하나
  components/           번호공, 오행 막대, 원국표, 번호 선택판, 공통 UI
  state/AppState.tsx    앱 전체 상태
  lib/                  계산 로직 (앱과 공유)
  styles.css            쪽빛 팔레트, 레이아웃
public/fonts/           한자 부분 글꼴 (HanjaSerif, SIL OFL 1.1)
scripts/verify-logic.ts 로직 검증
docs/draw-proxy-worker.js  당첨번호 중계 서버 예시 (CORS 포함)
```

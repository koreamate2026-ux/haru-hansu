import type { CapacitorConfig } from '@capacitor/cli';

/**
 * 하루 한수 앱 설정.
 * appId(번들 ID)는 스토어에 한 번 올리면 바꿀 수 없어요. 출시 전에 확정하세요.
 * 앱은 휴대폰 안에 넣은 화면(dist)을 열고, API는 .env.production의 서버 주소로 부른다.
 */
const config: CapacitorConfig = {
  appId: 'com.haruhansu.app',
  appName: '하루 한수',
  webDir: 'dist',
  backgroundColor: '#f3f0e6',
  ios: {
    contentInset: 'never',
  },
  android: {
    // 사이트와 같은 https 주소 체계로 열어서 쿠키·저장소가 웹과 같은 규칙으로 동작
    allowMixedContent: false,
  },
};

export default config;

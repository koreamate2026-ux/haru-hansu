import { Capacitor } from '@capacitor/core';

/** 아이폰·안드로이드 앱 안에서 실행 중인지(웹 브라우저면 false) */
export const isNativeApp = Capacitor.isNativePlatform();
export const nativePlatform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'

/** 초대 링크처럼 밖으로 공유하는 주소의 기준. 앱 안의 주소(capacitor://localhost)는 다른 사람이 열 수 없어서 웹 주소를 쓴다 */
export const PUBLIC_WEB_BASE = 'https://haru-hansu.vercel.app/';

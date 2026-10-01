import { KEYS, load, save } from './storage';

/** 초대 링크. 해시 라우터라 #/join/코드 모양이다 */
export const inviteUrl = (code: string) => `${window.location.origin}${window.location.pathname}#/join/${code}`;

/** 카톡·문자에 붙여 넣을 초대 문구 */
export function inviteMessage(code: string, groupName: string, personName?: string | null) {
  const who = personName ? `${personName} 님, ` : '';
  return `${who}하루 한수 "${groupName}" 가족 그룹에 초대해요.\n아래 링크를 눌러 참여해 주세요. (7일 안에 한 번만 쓸 수 있어요)\n${inviteUrl(code)}\n\n초대 코드: ${code}`;
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export const getPendingJoin = () => load<string | null>(KEYS.pendingJoin, null);
export const setPendingJoin = (code: string | null) => save(KEYS.pendingJoin, code);

/** 로그인·가입 뒤 갈 곳: 초대 링크를 열어 둔 상태면 참여 화면, 아니면 원래 가던 곳 */
export function afterAuthPath(fallback: string) {
  const code = getPendingJoin();
  return code ? `/join/${encodeURIComponent(code)}` : fallback;
}

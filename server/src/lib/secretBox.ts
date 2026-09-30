import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * 빌링키처럼 DB에 그대로 두면 안 되는 값을 AES-256-GCM으로 암호화한다.
 * 키는 BILLING_ENC_KEY(없으면 JWT_SECRET)에서 만든다. 키를 바꾸면 기존 값은 못 푸니 바꾸지 말 것.
 * 형식: v1:<iv>:<tag>:<암호문> (모두 base64). 앞에 v1이 없으면 예전에 평문으로 저장된 값으로 보고 그대로 쓴다.
 */
const SOURCE = process.env.BILLING_ENC_KEY || process.env.JWT_SECRET || '';
const KEY = createHash('sha256').update(`haru-hansu-billing:${SOURCE}`).digest();

export function seal(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', KEY, iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), ct.toString('base64')].join(':');
}

export function open(stored: string): string {
  if (!stored.startsWith('v1:')) return stored;
  const [, iv, tag, ct] = stored.split(':');
  const decipher = createDecipheriv('aes-256-gcm', KEY, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ct, 'base64')), decipher.final()]).toString('utf8');
}

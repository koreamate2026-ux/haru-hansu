import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;
if (!SECRET) throw new Error('JWT_SECRET 환경변수가 필요합니다.');

export interface TokenPayload {
  accountId: string;
}

export const signToken = (payload: TokenPayload) => jwt.sign(payload, SECRET, { expiresIn: '30d' });

export const verifyToken = (token: string): TokenPayload => jwt.verify(token, SECRET) as TokenPayload;

/** 인증번호 확인에 성공했다는 증표. 그 번호로 가입할 때만 짧게 쓰인다 */
export interface PhoneTokenPayload {
  phone: string;
  purpose: 'phone-verify';
}

export const signPhoneToken = (phone: string) => jwt.sign({ phone, purpose: 'phone-verify' }, SECRET, { expiresIn: '15m' });

export function verifyPhoneToken(token: string, phone: string): boolean {
  try {
    const payload = jwt.verify(token, SECRET!) as unknown as PhoneTokenPayload;
    return payload.purpose === 'phone-verify' && payload.phone === phone;
  } catch {
    return false;
  }
}

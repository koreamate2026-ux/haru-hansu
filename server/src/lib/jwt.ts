import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;
if (!SECRET) throw new Error('JWT_SECRET 환경변수가 필요합니다.');

export interface TokenPayload {
  accountId: string;
}

export const signToken = (payload: TokenPayload) => jwt.sign(payload, SECRET, { expiresIn: '30d' });

export const verifyToken = (token: string): TokenPayload => jwt.verify(token, SECRET) as TokenPayload;

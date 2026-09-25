import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../lib/jwt.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      accountId?: string;
    }
  }
}

/** Authorization: Bearer <token> 헤더를 검사해 req.accountId를 채운다 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: '로그인이 필요해요.' });
  try {
    req.accountId = verifyToken(token).accountId;
    next();
  } catch {
    return res.status(401).json({ error: '로그인이 만료됐어요. 다시 로그인해 주세요.' });
  }
}

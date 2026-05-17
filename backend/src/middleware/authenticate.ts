import { Response, NextFunction } from 'express';
import { UnauthorizedError } from '../errors/AppError';
import { verifyAccessToken } from '../utils/jwt';
import type { AuthRequest } from '../types';

/**
 * Verifies the Bearer JWT on every protected route.
 * Attaches the decoded payload to req.user.
 */
export function authenticate(req: AuthRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or malformed Authorization header'));
  }

  const token = authHeader.split(' ')[1];

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Access token expired'));
    }
    next(new UnauthorizedError('Invalid access token'));
  }
}

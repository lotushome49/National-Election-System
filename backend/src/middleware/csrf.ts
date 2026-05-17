import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { env } from '../configs/env';
import { ForbiddenError } from '../errors/AppError';

const CSRF_HEADER = 'x-csrf-token';
const CSRF_COOKIE = 'csrf_token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Double-submit cookie CSRF protection.
 *
 * On GET /api/v1/csrf-token  → issues a signed token in a cookie + response body.
 * On state-changing requests → validates that the header matches the cookie.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Skip safe methods
  if (SAFE_METHODS.has(req.method)) return next();

  const cookieToken  = req.cookies?.[CSRF_COOKIE];
  const headerToken  = req.headers[CSRF_HEADER] as string | undefined;

  if (!cookieToken || !headerToken) {
    return next(new ForbiddenError('CSRF token missing'));
  }

  // Constant-time comparison to prevent timing attacks
  const cookieBuf = Buffer.from(cookieToken);
  const headerBuf = Buffer.from(headerToken);

  if (
    cookieBuf.length !== headerBuf.length ||
    !crypto.timingSafeEqual(cookieBuf, headerBuf)
  ) {
    return next(new ForbiddenError('CSRF token mismatch'));
  }

  next();
}

/** Issues a new CSRF token — call this on GET /api/v1/csrf-token */
export function issueCsrfToken(req: Request, res: Response): void {
  const token = crypto
    .createHmac('sha256', env.CSRF_SECRET)
    .update(crypto.randomBytes(32))
    .digest('hex');

  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,   // must be readable by JS to put in header
    secure:   env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   60 * 60 * 1000,  // 1 hour
  });

  res.json({ success: true, data: { csrfToken: token } });
}

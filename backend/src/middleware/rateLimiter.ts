import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

const windowMs = parseInt(env.RATE_LIMIT_WINDOW_MS, 10);

// ─── Global API limiter ───────────────────────────────────────────────────────
export const globalLimiter = rateLimit({
  windowMs,
  max: parseInt(env.RATE_LIMIT_MAX, 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later' },
});

// ─── Auth endpoints (stricter) ────────────────────────────────────────────────
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 min
  max: parseInt(env.AUTH_RATE_LIMIT_MAX, 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts, please try again after 15 minutes' },
  skipSuccessfulRequests: true,  // only count failed attempts
});

// ─── Vote casting (one per voter per election — DB enforced, but also rate-limited) ──
export const voteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,   // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Vote rate limit exceeded' },
  keyGenerator: (req) => (req as any).user?.sub ?? req.ip ?? 'unknown',
});

import rateLimit from "express-rate-limit";
import { env } from "../configs/env";

const windowMs = parseInt(env.RATE_LIMIT_WINDOW_MS, 10);

// ─── Global API limiter ───────────────────────────────────────────────────────
export const globalLimiter = rateLimit({
  windowMs,
  max: parseInt(env.RATE_LIMIT_MAX, 100),
  standardHeaders: true,
  legacyHeaders: false,
  // Do not apply the global limiter to geography endpoints (they have a dedicated limiter)
  skip: (req) => {
    const p = req.path || "";
    return (
      p.startsWith("/api/v1/regions") ||
      p.startsWith("/api/v1/districts") ||
      p.startsWith("/api/v1/polling-stations")
    );
  },
  message: {
    success: false,
    message: "Too many requests, please try again later",
  },
});

// ─── Auth endpoints (stricter) ────────────────────────────────────────────────
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: parseInt(env.AUTH_RATE_LIMIT_MAX, 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Too many authentication attempts, please try again after 15 minutes",
  },
  skipSuccessfulRequests: true, // only count failed attempts
});

// ─── Vote casting (one per voter per election — DB enforced, but also rate-limited) ──
export const voteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Vote rate limit exceeded" },
  keyGenerator: (req) => (req as any).user?.sub ?? req.ip ?? "unknown",
});

// Geography endpoints can receive more frequent requests from the admin UI; allow a higher limit.
export const geographyLimiter = rateLimit({
  windowMs,
  max: parseInt(env.GEOGRAPHY_RATE_LIMIT_MAX, 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Too many geography requests right now. Please wait a moment and try again.",
  },
});

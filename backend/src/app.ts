import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';

import { env } from './config/env';
import { globalLimiter } from './middleware/rateLimiter';
import { requestLogger } from './middleware/requestLogger';
import { csrfProtection } from './middleware/csrf';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import apiRoutes from './routes/index';

export function createApp(): Application {
  const app = express();

  // ── Trust proxy (needed behind nginx / load balancer) ──────────────────────
  app.set('trust proxy', 1);

  // ── Security headers ────────────────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc:  ["'self'"],
          styleSrc:   ["'self'", "'unsafe-inline'"],
          imgSrc:     ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // ── CORS ────────────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin:      env.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
      methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
    }),
  );

  // ── Body parsing & cookies ──────────────────────────────────────────────────
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  // ── Compression ─────────────────────────────────────────────────────────────
  app.use(compression());

  // ── Request logging ─────────────────────────────────────────────────────────
  app.use(requestLogger);

  // ── Global rate limiter ─────────────────────────────────────────────────────
  app.use(globalLimiter);

  // ── CSRF protection (skip for GET/HEAD/OPTIONS — handled inside middleware) ─
  app.use(csrfProtection);

  // ── Versioned API routes ────────────────────────────────────────────────────
  app.use(`/api/${env.API_VERSION}`, apiRoutes);

  // ── 404 & error handlers (must be last) ────────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

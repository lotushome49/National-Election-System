import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { JwtPayload } from '../types';

// ─── Sign access token (short-lived) ─────────────────────────────────────────
export function signAccessToken(payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): string {
  return jwt.sign(
    { ...payload, type: 'access' },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN, issuer: 'nehs-api', audience: 'nehs-client' },
  );
}

// ─── Sign refresh token (long-lived) ─────────────────────────────────────────
export function signRefreshToken(payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): string {
  return jwt.sign(
    { ...payload, type: 'refresh' },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN, issuer: 'nehs-api', audience: 'nehs-client' },
  );
}

// ─── Verify access token ──────────────────────────────────────────────────────
export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET, {
    issuer: 'nehs-api',
    audience: 'nehs-client',
  }) as JwtPayload;
}

// ─── Verify refresh token ─────────────────────────────────────────────────────
export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, {
    issuer: 'nehs-api',
    audience: 'nehs-client',
  }) as JwtPayload;
}

// ─── Decode without verification (for logging only) ──────────────────────────
export function decodeToken(token: string): JwtPayload | null {
  return jwt.decode(token) as JwtPayload | null;
}

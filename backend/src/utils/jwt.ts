import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../configs/env";
import type { JwtPayload } from "../types";

// ─── Sign access token (short-lived) ─────────────────────────────────────────
export function signAccessToken(
  payload: Omit<JwtPayload, "type" | "iat" | "exp">,
): string {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
    issuer: "nehs-api",
    audience: "nehs-client",
  };

  return jwt.sign({ ...payload, type: "access" }, env.JWT_SECRET, options);
}

// ─── Sign refresh token (long-lived) ─────────────────────────────────────────
export function signRefreshToken(
  payload: Omit<JwtPayload, "type" | "iat" | "exp">,
): string {
  const options: SignOptions = {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions["expiresIn"],
    issuer: "nehs-api",
    audience: "nehs-client",
  };

  return jwt.sign(
    { ...payload, type: "refresh" },
    env.JWT_REFRESH_SECRET,
    options,
  );
}

export function signMfaChallengeToken(
  payload: Omit<JwtPayload, "type" | "iat" | "exp">,
): string {
  const options: SignOptions = {
    expiresIn: '5m',
    issuer: 'nehs-api',
    audience: 'nehs-client',
  };

  return jwt.sign({ ...payload, type: 'mfa' }, env.JWT_SECRET, options);
}

// ─── Verify access token ──────────────────────────────────────────────────────
export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET, {
    issuer: "nehs-api",
    audience: "nehs-client",
  }) as JwtPayload;
}

// ─── Verify refresh token ─────────────────────────────────────────────────────
export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, {
    issuer: "nehs-api",
    audience: "nehs-client",
  }) as JwtPayload;
}

export function verifyMfaChallengeToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET, {
    issuer: 'nehs-api',
    audience: 'nehs-client',
  }) as JwtPayload;
}

// ─── Decode without verification (for logging only) ──────────────────────────
export function decodeToken(token: string): JwtPayload | null {
  return jwt.decode(token) as JwtPayload | null;
}

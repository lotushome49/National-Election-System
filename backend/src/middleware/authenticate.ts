import { Response, NextFunction } from "express";
import { UnauthorizedError } from "../errors/AppError";
import { verifyAccessToken } from "../utils/jwt";
import { authRepository } from "../modules/auth/auth.repository";
import type { AuthRequest } from "../types";

/**
 * Verifies the Bearer JWT on every protected route.
 * Attaches the decoded payload to req.user.
 */
export async function authenticate(
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return next(
      new UnauthorizedError("Missing or malformed Authorization header"),
    );
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = verifyAccessToken(token);

    if (!payload.sid) {
      return next(
        new UnauthorizedError("Session identifier missing from access token"),
      );
    }

    const session = await authRepository.findActiveSessionById(payload.sid);
    if (!session || session.userId !== payload.sub) {
      return next(new UnauthorizedError("Session is no longer active"));
    }

    req.user = payload;
    await authRepository.touchSession(payload.sid);
    next();
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      return next(new UnauthorizedError("Access token expired"));
    }
    next(new UnauthorizedError("Invalid access token"));
  }
}

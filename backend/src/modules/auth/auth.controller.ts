import { Request, Response, NextFunction } from "express";
import { authService } from "./auth.service";
import { voterService } from "../voter/voter.service";
import { votingService } from "../voting/voting.service";
import { authRepository } from "./auth.repository";
import { sendCreated, sendSuccess } from "../../utils/response";
import type { AuthRequest } from "../../types";
import { signAccessToken } from "../../utils/jwt";

export const authController = {
  login: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.login(req.body, req.ip ?? "");
      sendSuccess(res, result, "Login successful");
    } catch (err) {
      next(err);
    }
  },

  biometricLogin: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.biometricLogin(req.body, req.ip ?? "");
      sendSuccess(res, result, "Biometric login successful");
    } catch (err) {
      next(err);
    }
  },

  registerVoter: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await voterService.register(
        req.body,
        "PUBLIC",
        req.ip ?? "",
        undefined,
        { isVerified: true },
      );

      const tokenIssue = await votingService.issueSystemToken(
        result.id,
        req.ip ?? "",
      );

      const session = await authRepository.createSession({
        userId: result.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress: req.ip ?? "",
      });

      const accessToken = signAccessToken(
        {
          sub: result.id,
          sid: session.id,
          role: "VOTER",
        },
        session.id,
      );

      sendCreated(
        res,
        {
          ...result,
          accessToken,
          sessionId: session.id,
          votingToken: tokenIssue?.token ?? null,
          votingElectionId: tokenIssue?.electionId ?? null,
          votingTokenExpiresAt: tokenIssue?.expiresAt ?? null,
        },
        "Voter registered successfully",
      );
    } catch (err) {
      next(err);
    }
  },

  refresh: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.refresh(req.body);
      sendSuccess(res, result, "Token refreshed");
    } catch (err) {
      next(err);
    }
  },

  logout: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await authService.logout(req.user!.sub, req.user?.sid, req.ip ?? "");
      sendSuccess(res, null, "Logged out successfully");
    } catch (err) {
      next(err);
    }
  },

  sessions: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await authService.listSessions(req.user!.sub);
      sendSuccess(res, result, "Active sessions loaded");
    } catch (err) {
      next(err);
    }
  },

  revokeSession: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await authService.revokeSession(
        req.user!.sub,
        req.params.sessionId,
        req.ip ?? "",
      );
      sendSuccess(res, result, "Session revoked");
    } catch (err) {
      next(err);
    }
  },

  mfaStatus: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await authService.getMfaStatus(req.user!.sub);
      sendSuccess(res, result, "MFA status loaded");
    } catch (err) {
      next(err);
    }
  },

  beginMfaEnrollment: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await authService.beginMfaEnrollment(req.user!.sub);
      sendSuccess(res, result, "MFA enrollment initialized");
    } catch (err) {
      next(err);
    }
  },

  verifyMfaEnrollment: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await authService.verifyMfaEnrollment(
        req.user!.sub,
        req.body,
        req.ip ?? "",
      );
      sendSuccess(res, result, "MFA enabled");
    } catch (err) {
      next(err);
    }
  },

  completeMfaChallenge: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await authService.completeMfaChallenge(
        req.body,
        req.ip ?? "",
      );
      sendSuccess(res, result, "MFA challenge complete");
    } catch (err) {
      next(err);
    }
  },

  disableMfa: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await authService.disableMfa(
        req.user!.sub,
        req.body,
        req.ip ?? "",
      );
      sendSuccess(res, result, "MFA disabled");
    } catch (err) {
      next(err);
    }
  },

  me: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      sendSuccess(res, req.user, "Current user");
    } catch (err) {
      next(err);
    }
  },
};

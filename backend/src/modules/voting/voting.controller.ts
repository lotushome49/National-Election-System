import { Response, NextFunction } from "express";
import { votingService } from "./voting.service";
import { sendSuccess, sendCreated } from "../../utils/response";
import type { AuthRequest } from "../../types";

export const votingController = {
  me: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await votingService.getMyStatus(req.user!.sub);
      sendSuccess(res, result, "Voting status loaded");
    } catch (err) {
      next(err);
    }
  },

  issueToken: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { electionId, voterId } = req.body;
      const result = await votingService.issueToken(
        electionId,
        voterId,
        req.user!.sub,
        req.ip ?? "",
      );
      sendCreated(res, result, "Voting token issued");
    } catch (err) {
      next(err);
    }
  },

  castVote: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await votingService.castVote(
        req.body,
        req.user!.sub,
        req.ip ?? "",
      );
      sendCreated(res, result, "Vote cast successfully");
    } catch (err) {
      next(err);
    }
  },

  verifyReceipt: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await votingService.verifyReceipt(req.params.receiptHash);
      sendSuccess(res, result, "Receipt verified");
    } catch (err) {
      next(err);
    }
  },
};

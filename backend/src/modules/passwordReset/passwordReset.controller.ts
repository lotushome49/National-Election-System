import { NextFunction, Request, Response } from "express";
import { passwordResetService } from "./passwordReset.service";
import { sendSuccess } from "../../utils/response";

export const passwordResetController = {
  requestReset: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await passwordResetService.requestReset(req.body, {
        ip: req.ip ?? "",
        userAgent: req.headers["user-agent"],
        origin: req.headers.origin,
      });
      sendSuccess(res, result, "Password reset requested");
    } catch (err) {
      next(err);
    }
  },

  confirmReset: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await passwordResetService.confirmReset(
        req.body,
        req.ip ?? "",
      );
      sendSuccess(res, result, "Password reset completed");
    } catch (err) {
      next(err);
    }
  },

  devMailbox: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      sendSuccess(
        res,
        passwordResetService.listDevMailbox(),
        "Dev mailbox loaded",
      );
    } catch (err) {
      next(err);
    }
  },
};

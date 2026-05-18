import { Response, NextFunction } from "express";
import { voterService } from "./voter.service";
import {
  sendSuccess,
  sendCreated,
  sendNoContent,
  sendPaginated,
} from "../../utils/response";
import type { AuthRequest } from "../../types";

export const voterController = {
  list: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { data, meta } = await voterService.list(req.query as any, req.user);
      sendPaginated(res, data, meta);
    } catch (err) {
      next(err);
    }
  },

  getById: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      sendSuccess(res, await voterService.getById(req.params.id, req.user));
    } catch (err) {
      next(err);
    }
  },

  register: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await voterService.register(
        req.body,
        req.user!.sub,
        req.ip ?? "",
        req.user,
      );
      sendCreated(res, result, "Voter registered successfully");
    } catch (err) {
      next(err);
    }
  },

  update: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      sendSuccess(
        res,
        await voterService.update(
          req.params.id,
          req.body,
          req.user!.sub,
          req.ip ?? "",
          req.user,
        ),
      );
    } catch (err) {
      next(err);
    }
  },

  remove: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await voterService.remove(
        req.params.id,
        req.user!.sub,
        req.ip ?? "",
        req.user,
      );
      sendNoContent(res);
    } catch (err) {
      next(err);
    }
  },

  verify: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { verified } = req.body;
      const result = await voterService.verify(
        req.params.id,
        Boolean(verified),
        req.user!.sub,
        req.ip ?? "",
        req.user,
      );
      sendSuccess(res, result, "Voter verification status updated successfully");
    } catch (err) {
      next(err);
    }
  },
};

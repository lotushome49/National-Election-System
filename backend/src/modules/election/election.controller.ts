import { Response, NextFunction } from "express";
import { electionService } from "./election.service";
import {
  sendSuccess,
  sendCreated,
  sendNoContent,
  sendPaginated,
} from "../../utils/response";
import type { AuthRequest } from "../../types";

export const electionController = {
  list: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { data, meta } = await electionService.list(req.query as any);
      sendPaginated(res, data, meta);
    } catch (err) {
      next(err);
    }
  },

  getHistory: async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const limit = Number((_req.query?.limit as string | undefined) ?? 10);
      const data = await electionService.getHistory(
        Number.isFinite(limit) && limit > 0 ? Math.min(limit, 20) : 10,
      );
      sendSuccess(res, data, "Historical elections loaded");
    } catch (err) {
      next(err);
    }
  },

  getById: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      sendSuccess(res, await electionService.getById(req.params.id));
    } catch (err) {
      next(err);
    }
  },

  getCurrentOpen: async (
    _req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      sendSuccess(
        res,
        await electionService.getCurrentOpen(),
        "Open election loaded",
      );
    } catch (err) {
      next(err);
    }
  },

  create: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      sendCreated(
        res,
        await electionService.create(req.body, req.user!.sub, req.ip ?? ""),
        "Election created",
      );
    } catch (err) {
      next(err);
    }
  },

  update: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      sendSuccess(
        res,
        await electionService.update(
          req.params.id,
          req.body,
          req.user!.sub,
          req.ip ?? "",
        ),
      );
    } catch (err) {
      next(err);
    }
  },

  transition: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      sendSuccess(
        res,
        await electionService.transition(
          req.params.id,
          req.body,
          req.user!.sub,
          req.ip ?? "",
        ),
        "Election status updated",
      );
    } catch (err) {
      next(err);
    }
  },

  remove: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await electionService.remove(req.params.id, req.user!.sub, req.ip ?? "");
      sendNoContent(res);
    } catch (err) {
      next(err);
    }
  },
};

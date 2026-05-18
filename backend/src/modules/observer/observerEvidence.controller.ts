import { NextFunction, Response } from "express";
import type { AuthRequest } from "../../types";
import {
  sendCreated,
  sendNoContent,
  sendPaginated,
  sendSuccess,
} from "../../utils/response";
import { observerEvidenceService } from "./observerEvidence.service";

export const observerEvidenceController = {
  upload: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const files = (req.files as Express.Multer.File[] | undefined) ?? [];
      sendCreated(
        res,
        await observerEvidenceService.upload(
          files,
          req.user!.sub,
          req.ip ?? "",
        ),
        "Evidence uploaded",
      );
    } catch (err) {
      next(err);
    }
  },

  list: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 20);
      const ownedOnly = req.query.ownedOnly === "true";
      const { data, meta } = await observerEvidenceService.list(
        req.user!.sub,
        req.user!.role,
        page,
        limit,
        ownedOnly,
      );
      sendPaginated(res, data, meta);
    } catch (err) {
      next(err);
    }
  },

  getById: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      sendSuccess(
        res,
        await observerEvidenceService.getById(
          req.params.id,
          req.user!.sub,
          req.user!.role,
        ),
      );
    } catch (err) {
      next(err);
    }
  },

  remove: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await observerEvidenceService.remove(
        req.params.id,
        req.user!.sub,
        req.user!.role,
        req.ip ?? "",
      );
      sendNoContent(res);
    } catch (err) {
      next(err);
    }
  },
};

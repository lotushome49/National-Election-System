import { Response, NextFunction } from "express";
import { candidateService } from "./candidate.service";
import {
  sendSuccess,
  sendCreated,
  sendNoContent,
  sendPaginated,
} from "../../utils/response";
import { BadRequestError } from "../../errors/AppError";
import type { AuthRequest } from "../../types";

export const candidateController = {
  list: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { data, meta } = await candidateService.list(req.query as any, req.user);
      sendPaginated(res, data, meta);
    } catch (err) {
      next(err);
    }
  },

  getById: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      sendSuccess(res, await candidateService.getById(req.params.id, req.user));
    } catch (err) {
      next(err);
    }
  },

  create: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      sendCreated(
        res,
        await candidateService.create(
          req.body,
          req.user!.sub,
          req.ip ?? "",
          req.user,
        ),
        "Candidate submitted",
      );
    } catch (err) {
      next(err);
    }
  },

  update: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      sendSuccess(
        res,
        await candidateService.update(
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

  updateStatus: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      sendSuccess(
        res,
        await candidateService.updateStatus(
          req.params.id,
          req.body,
          req.user!.sub,
          req.ip ?? "",
          req.user,
        ),
        "Candidate status updated",
      );
    } catch (err) {
      next(err);
    }
  },

  remove: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await candidateService.remove(
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

  uploadDocuments: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const files = (req.files || []) as Express.Multer.File[];
      if (files.length === 0) {
        throw new BadRequestError("No files uploaded");
      }
      const updated = await candidateService.uploadDocuments(
        req.params.id,
        files,
        req.user!.sub,
        req.ip ?? "",
        req.user,
      );
      sendSuccess(res, updated, "Candidate credentials uploaded");
    } catch (err) {
      next(err);
    }
  },
};

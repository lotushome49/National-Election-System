import { NextFunction, Response } from "express";
import type { AuthRequest } from "../../types";
import { sendSuccess } from "../../utils/response";
import { roleService } from "./role.service";

export const roleController = {
  list: async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const roles = await roleService.list();
      sendSuccess(res, roles);
    } catch (err) {
      next(err);
    }
  },
};

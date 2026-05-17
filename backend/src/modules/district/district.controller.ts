import { Response, NextFunction } from 'express';
import { sendCreated, sendNoContent, sendPaginated, sendSuccess } from '../../utils/response';
import type { AuthRequest } from '../../types';
import { districtService } from './district.service';

export const districtController = {
  list: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { data, meta } = await districtService.list(req.query as any, req.user);
      sendPaginated(res, data, meta);
    } catch (err) { next(err); }
  },

  getById: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      sendSuccess(res, await districtService.getById(req.params.id, req.user));
    } catch (err) { next(err); }
  },

  create: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      sendCreated(res, await districtService.create(req.body, req.user!.sub, req.ip ?? '', req.user), 'District created');
    } catch (err) { next(err); }
  },

  update: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      sendSuccess(res, await districtService.update(req.params.id, req.body, req.user!.sub, req.ip ?? '', req.user), 'District updated');
    } catch (err) { next(err); }
  },

  remove: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await districtService.remove(req.params.id, req.user!.sub, req.ip ?? '', req.user);
      sendNoContent(res);
    } catch (err) { next(err); }
  },
};

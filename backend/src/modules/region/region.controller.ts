import { Response, NextFunction } from 'express';
import { regionService } from './region.service';
import { sendCreated, sendNoContent, sendPaginated, sendSuccess } from '../../utils/response';
import type { AuthRequest } from '../../types';

export const regionController = {
  list: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { data, meta } = await regionService.list(req.query as any);
      sendPaginated(res, data, meta);
    } catch (err) { next(err); }
  },

  getById: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      sendSuccess(res, await regionService.getById(req.params.id));
    } catch (err) { next(err); }
  },

  create: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      sendCreated(res, await regionService.create(req.body, req.user!.sub, req.ip ?? ''), 'Region created');
    } catch (err) { next(err); }
  },

  update: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      sendSuccess(res, await regionService.update(req.params.id, req.body, req.user!.sub, req.ip ?? ''), 'Region updated');
    } catch (err) { next(err); }
  },

  remove: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await regionService.remove(req.params.id, req.user!.sub, req.ip ?? '');
      sendNoContent(res);
    } catch (err) { next(err); }
  },
};

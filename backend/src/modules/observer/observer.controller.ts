import { Response, NextFunction } from 'express';
import { observerService } from './observer.service';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../../utils/response';
import type { AuthRequest } from '../../types';

export const observerController = {
  list: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { data, meta } = await observerService.list(req.query as any);
      sendPaginated(res, data, meta);
    } catch (err) { next(err); }
  },

  getById: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      sendSuccess(res, await observerService.getById(req.params.id));
    } catch (err) { next(err); }
  },

  create: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      sendCreated(
        res,
        await observerService.create(req.body, req.user!.sub, req.ip ?? ''),
        'Report submitted',
      );
    } catch (err) { next(err); }
  },

  updateStatus: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      sendSuccess(
        res,
        await observerService.updateStatus(req.params.id, req.body, req.user!.sub, req.ip ?? ''),
        'Report status updated',
      );
    } catch (err) { next(err); }
  },

  remove: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await observerService.remove(req.params.id, req.user!.sub, req.ip ?? '');
      sendNoContent(res);
    } catch (err) { next(err); }
  },
};

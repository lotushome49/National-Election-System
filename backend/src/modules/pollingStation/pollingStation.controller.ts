import { Response, NextFunction } from 'express';
import { sendCreated, sendNoContent, sendPaginated, sendSuccess } from '../../utils/response';
import type { AuthRequest } from '../../types';
import { pollingStationService } from './pollingStation.service';

export const pollingStationController = {
  list: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { data, meta } = await pollingStationService.list(req.query as any, req.user);
      sendPaginated(res, data, meta);
    } catch (err) { next(err); }
  },

  getById: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      sendSuccess(res, await pollingStationService.getById(req.params.id, req.user));
    } catch (err) { next(err); }
  },

  create: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      sendCreated(
        res,
        await pollingStationService.create(req.body, req.user!.sub, req.ip ?? '', req.user),
        'Polling station created',
      );
    } catch (err) { next(err); }
  },

  update: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      sendSuccess(
        res,
        await pollingStationService.update(req.params.id, req.body, req.user!.sub, req.ip ?? '', req.user),
        'Polling station updated',
      );
    } catch (err) { next(err); }
  },

  remove: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await pollingStationService.remove(req.params.id, req.user!.sub, req.ip ?? '', req.user);
      sendNoContent(res);
    } catch (err) { next(err); }
  },
};

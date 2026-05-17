import { Response, NextFunction } from 'express';
import { resultService } from './result.service';
import { sendSuccess, sendPaginated } from '../../utils/response';
import type { AuthRequest } from '../../types';

export const resultController = {
  list: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { data, meta } = await resultService.list(req.query as any);
      sendPaginated(res, data, meta);
    } catch (err) { next(err); }
  },

  compute: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await resultService.compute(req.body, req.user!.sub, req.ip ?? '');
      sendSuccess(res, result, 'Results computed successfully');
    } catch (err) { next(err); }
  },
};

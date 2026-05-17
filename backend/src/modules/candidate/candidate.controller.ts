import { Response, NextFunction } from 'express';
import { candidateService } from './candidate.service';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../../utils/response';
import type { AuthRequest } from '../../types';

export const candidateController = {
  list: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { data, meta } = await candidateService.list(req.query as any);
      sendPaginated(res, data, meta);
    } catch (err) { next(err); }
  },

  getById: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      sendSuccess(res, await candidateService.getById(req.params.id));
    } catch (err) { next(err); }
  },

  create: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      sendCreated(res, await candidateService.create(req.body, req.user!.sub, req.ip ?? ''), 'Candidate submitted');
    } catch (err) { next(err); }
  },

  update: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      sendSuccess(res, await candidateService.update(req.params.id, req.body, req.user!.sub, req.ip ?? ''));
    } catch (err) { next(err); }
  },

  updateStatus: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      sendSuccess(res, await candidateService.updateStatus(req.params.id, req.body, req.user!.sub, req.ip ?? ''), 'Candidate status updated');
    } catch (err) { next(err); }
  },

  remove: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await candidateService.remove(req.params.id, req.user!.sub, req.ip ?? '');
      sendNoContent(res);
    } catch (err) { next(err); }
  },
};

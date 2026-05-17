import { Response, NextFunction } from 'express';
import { userService } from './user.service';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../../utils/response';
import type { AuthRequest } from '../../types';

export const userController = {
  list: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { data, meta } = await userService.list(req.query as any);
      sendPaginated(res, data, meta);
    } catch (err) { next(err); }
  },

  getById: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await userService.getById(req.params.id);
      sendSuccess(res, user);
    } catch (err) { next(err); }
  },

  create: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await userService.create(req.body, req.user!.sub, req.ip ?? '');
      sendCreated(res, user, 'User created');
    } catch (err) { next(err); }
  },

  update: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await userService.update(req.params.id, req.body, req.user!.sub, req.ip ?? '');
      sendSuccess(res, user, 'User updated');
    } catch (err) { next(err); }
  },

  remove: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await userService.remove(req.params.id, req.user!.sub, req.ip ?? '');
      sendNoContent(res);
    } catch (err) { next(err); }
  },
};

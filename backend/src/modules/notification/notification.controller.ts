import { Response, NextFunction } from 'express';
import { notificationService } from './notification.service';
import { sendSuccess, sendPaginated } from '../../utils/response';
import type { AuthRequest } from '../../types';

export const notificationController = {
  list: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { data, meta } = await notificationService.listForUser(
        req.user!.sub,
        req.query as any,
      );
      sendPaginated(res, data, meta);
    } catch (err) { next(err); }
  },

  markRead: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const notification = await notificationService.markRead(req.params.id, req.user!.sub);
      sendSuccess(res, notification, 'Marked as read');
    } catch (err) { next(err); }
  },

  send: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await notificationService.send(req.body);
      sendSuccess(res, null, 'Notification sent');
    } catch (err) { next(err); }
  },

  broadcast: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await notificationService.broadcast(req.body);
      sendSuccess(res, result, `Broadcast queued for ${result.queued} users`);
    } catch (err) { next(err); }
  },
};

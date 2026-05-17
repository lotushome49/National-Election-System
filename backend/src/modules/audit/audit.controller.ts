import { Response, NextFunction } from 'express';
import { auditService } from './audit.service';
import { sendPaginated } from '../../utils/response';
import { buildPaginationMeta } from '../../utils/response';
import type { AuthRequest } from '../../types';

export const auditController = {
  list: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const page  = Number(req.query.page)  || 1;
      const limit = Number(req.query.limit) || 50;

      const { data, total } = await auditService.list({
        page, limit,
        userId:     req.query.userId     as string,
        electionId: req.query.electionId as string,
        action:     req.query.action     as string,
        entity:     req.query.entity     as string,
        from:       req.query.from       as string,
        to:         req.query.to         as string,
      });

      sendPaginated(res, data, buildPaginationMeta(total, page, limit));
    } catch (err) { next(err); }
  },
};

import { Router } from 'express';
import { auditController } from './audit.controller';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/rbac';

const router = Router();

router.use(authenticate, requirePermission('VIEW_AUDIT_LOGS'));

router.get('/', auditController.list);

export default router;

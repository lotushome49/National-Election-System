import { Router } from 'express';
import { resultController } from './result.controller';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { resultQuerySchema, computeResultSchema } from './result.schema';

const router = Router();

router.use(authenticate);

// Any authenticated user with VIEW_RESULTS permission can read
router.get('/', requirePermission('VIEW_RESULTS'), validate(resultQuerySchema, 'query'), resultController.list);

// Only admins can trigger computation
router.post('/compute', requirePermission('MANAGE_ELECTIONS'), validate(computeResultSchema), resultController.compute);

export default router;

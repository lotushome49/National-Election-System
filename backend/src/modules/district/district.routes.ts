import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission, scopeGuard } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { districtController } from './district.controller';
import { createDistrictSchema, districtQuerySchema, updateDistrictSchema } from './district.schema';

const router = Router();

router.use(authenticate);
router.use(requirePermission('MANAGE_DISTRICTS'));

router.get('/', scopeGuard, validate(districtQuerySchema, 'query'), districtController.list);
router.get('/:id', districtController.getById);
router.post('/', scopeGuard, validate(createDistrictSchema), districtController.create);
router.patch('/:id', scopeGuard, validate(updateDistrictSchema), districtController.update);
router.delete('/:id', districtController.remove);

export default router;

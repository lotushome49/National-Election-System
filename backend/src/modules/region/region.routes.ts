import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { regionController } from './region.controller';
import { createRegionSchema, regionQuerySchema, updateRegionSchema } from './region.schema';

const router = Router();

router.use(authenticate);
router.use(requirePermission('MANAGE_REGIONS'));

router.get('/', validate(regionQuerySchema, 'query'), regionController.list);
router.get('/:id', regionController.getById);
router.post('/', validate(createRegionSchema), regionController.create);
router.patch('/:id', validate(updateRegionSchema), regionController.update);
router.delete('/:id', regionController.remove);

export default router;

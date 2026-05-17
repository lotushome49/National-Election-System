import { Router } from 'express';
import { candidateController } from './candidate.controller';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import {
  createCandidateSchema, updateCandidateSchema,
  candidateStatusSchema, candidateQuerySchema,
} from './candidate.schema';

const router = Router();

router.use(authenticate);

// Public-ish: any authenticated user can view approved candidates
router.get('/',    validate(candidateQuerySchema, 'query'), candidateController.list);
router.get('/:id', candidateController.getById);

// Admin only
router.post(  '/',              requirePermission('MANAGE_CANDIDATES'), validate(createCandidateSchema), candidateController.create);
router.patch( '/:id',          requirePermission('MANAGE_CANDIDATES'), validate(updateCandidateSchema), candidateController.update);
router.patch( '/:id/status',   requirePermission('MANAGE_CANDIDATES'), validate(candidateStatusSchema), candidateController.updateStatus);
router.delete('/:id',          requirePermission('MANAGE_CANDIDATES'), candidateController.remove);

export default router;

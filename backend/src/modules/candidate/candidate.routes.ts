import { Router } from "express";
import { candidateController } from "./candidate.controller";
import { authenticate } from "../../middleware/authenticate";
import { requirePermission, scopeGuard } from "../../middleware/rbac";
import { validate } from "../../middleware/validate";
import {
  createCandidateSchema,
  updateCandidateSchema,
  candidateStatusSchema,
  candidateQuerySchema,
} from "./candidate.schema";

const router = Router();

router.use(authenticate);

// Any authenticated user can list/view candidates, but scoped roles stay in-region.
router.get(
  "/",
  scopeGuard,
  validate(candidateQuerySchema, "query"),
  candidateController.list,
);
router.get("/:id", scopeGuard, candidateController.getById);

// Candidate management is permission-gated and scope-gated.
router.post(
  "/",
  requirePermission("MANAGE_CANDIDATES"),
  scopeGuard,
  validate(createCandidateSchema),
  candidateController.create,
);
router.patch(
  "/:id",
  requirePermission("MANAGE_CANDIDATES"),
  scopeGuard,
  validate(updateCandidateSchema),
  candidateController.update,
);
router.patch(
  "/:id/status",
  requirePermission("MANAGE_CANDIDATES"),
  scopeGuard,
  validate(candidateStatusSchema),
  candidateController.updateStatus,
);
router.delete(
  "/:id",
  requirePermission("MANAGE_CANDIDATES"),
  scopeGuard,
  candidateController.remove,
);

export default router;

import { Router } from "express";
import { resultController } from "./result.controller";
import { authenticate } from "../../middleware/authenticate";
import { requirePermission, scopeGuard } from "../../middleware/rbac";
import { validate } from "../../middleware/validate";
import { resultQuerySchema, computeResultSchema } from "./result.schema";

const router = Router();

router.use(authenticate);

// Any user with VIEW_RESULTS can read, and scoped roles are constrained.
router.get(
  "/",
  requirePermission("VIEW_RESULTS"),
  scopeGuard,
  validate(resultQuerySchema, "query"),
  resultController.list,
);

// Result computation remains permission-gated and scope-gated.
router.post(
  "/compute",
  requirePermission("MANAGE_ELECTIONS"),
  scopeGuard,
  validate(computeResultSchema),
  resultController.compute,
);

export default router;

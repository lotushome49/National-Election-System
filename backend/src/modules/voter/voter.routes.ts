import { Router } from "express";
import { voterController } from "./voter.controller";
import { authenticate } from "../../middleware/authenticate";
import { requirePermission } from "../../middleware/rbac";
import { scopeGuard } from "../../middleware/rbac";
import { validate } from "../../middleware/validate";
import {
  registerVoterSchema,
  updateVoterSchema,
  voterQuerySchema,
} from "./voter.schema";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  requirePermission("MANAGE_VOTERS"),
  scopeGuard,
  validate(voterQuerySchema, "query"),
  voterController.list,
);
router.get(
  "/:id",
  requirePermission("MANAGE_VOTERS"),
  scopeGuard,
  voterController.getById,
);
router.post(
  "/",
  requirePermission("MANAGE_VOTERS"),
  scopeGuard,
  validate(registerVoterSchema),
  voterController.register,
);
router.patch(
  "/:id",
  requirePermission("MANAGE_VOTERS"),
  scopeGuard,
  validate(updateVoterSchema),
  voterController.update,
);
router.patch(
  "/:id/verify",
  requirePermission("MANAGE_VOTERS"),
  scopeGuard,
  voterController.verify,
);
router.delete(
  "/:id",
  requirePermission("MANAGE_VOTERS"),
  scopeGuard,
  voterController.remove,
);

export default router;

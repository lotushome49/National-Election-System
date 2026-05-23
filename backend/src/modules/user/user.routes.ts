import { Router } from "express";
import { userController } from "./user.controller";
import { authenticate } from "../../middleware/authenticate";
import { requirePermission, scopeGuard } from "../../middleware/rbac";
import { validate } from "../../middleware/validate";
import {
  createUserSchema,
  updateUserSchema,
  userQuerySchema,
} from "./user.schema";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  requirePermission("MANAGE_USERS"),
  scopeGuard,
  validate(userQuerySchema, "query"),
  userController.list,
);
router.get(
  "/:id",
  requirePermission("MANAGE_USERS"),
  scopeGuard,
  userController.getById,
);
router.post(
  "/",
  requirePermission("MANAGE_USERS"),
  scopeGuard,
  validate(createUserSchema),
  userController.create,
);
router.patch(
  "/:id",
  requirePermission("MANAGE_USERS"),
  scopeGuard,
  validate(updateUserSchema),
  userController.update,
);
router.delete(
  "/:id",
  requirePermission("MANAGE_USERS"),
  scopeGuard,
  userController.remove,
);

export default router;

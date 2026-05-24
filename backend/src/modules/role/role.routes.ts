import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requirePermission } from "../../middleware/rbac";
import { roleController } from "./role.controller";

const router = Router();

router.use(authenticate);
router.use(requirePermission("MANAGE_USERS"));

router.get("/", roleController.list);

export default router;

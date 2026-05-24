import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requirePermission, scopeGuard } from "../../middleware/rbac";
import { validate } from "../../middleware/validate";
import { regionController } from "./region.controller";
import { geographyLimiter } from "../../middleware/rateLimiter";
import {
  createRegionSchema,
  regionQuerySchema,
  updateRegionSchema,
} from "./region.schema";

const router = Router();

router.use(authenticate);
router.use(geographyLimiter);
router.use(requirePermission("MANAGE_REGIONS"));

router.get(
  "/",
  scopeGuard,
  validate(regionQuerySchema, "query"),
  regionController.list,
);
router.get("/:id", scopeGuard, regionController.getById);
router.post(
  "/",
  scopeGuard,
  validate(createRegionSchema),
  regionController.create,
);
router.patch(
  "/:id",
  scopeGuard,
  validate(updateRegionSchema),
  regionController.update,
);
router.delete("/:id", scopeGuard, regionController.remove);

export default router;

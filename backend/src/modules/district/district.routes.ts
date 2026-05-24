import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requirePermission, scopeGuard } from "../../middleware/rbac";
import { validate } from "../../middleware/validate";
import { districtController } from "./district.controller";
import {
  createDistrictSchema,
  districtQuerySchema,
  updateDistrictSchema,
} from "./district.schema";
import { geographyLimiter } from "../../middleware/rateLimiter";

const router = Router();

router.use(authenticate);
router.use(geographyLimiter);
router.use(requirePermission("MANAGE_DISTRICTS"));

router.get(
  "/",
  scopeGuard,
  validate(districtQuerySchema, "query"),
  districtController.list,
);
router.get("/:id", scopeGuard, districtController.getById);
router.post(
  "/",
  scopeGuard,
  validate(createDistrictSchema),
  districtController.create,
);
router.patch(
  "/:id",
  scopeGuard,
  validate(updateDistrictSchema),
  districtController.update,
);
router.delete("/:id", scopeGuard, districtController.remove);

export default router;

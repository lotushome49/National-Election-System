import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requirePermission, scopeGuard } from "../../middleware/rbac";
import { validate } from "../../middleware/validate";
import { pollingStationController } from "./pollingStation.controller";
import {
  createPollingStationSchema,
  pollingStationQuerySchema,
  updatePollingStationSchema,
} from "./pollingStation.schema";
import { geographyLimiter } from "../../middleware/rateLimiter";

const router = Router();

router.use(authenticate);
router.use(geographyLimiter);
router.use(requirePermission("MANAGE_POLLING_STATIONS"));

router.get(
  "/",
  scopeGuard,
  validate(pollingStationQuerySchema, "query"),
  pollingStationController.list,
);
router.get("/:id", scopeGuard, pollingStationController.getById);
router.post(
  "/",
  scopeGuard,
  validate(createPollingStationSchema),
  pollingStationController.create,
);
router.patch(
  "/:id",
  scopeGuard,
  validate(updatePollingStationSchema),
  pollingStationController.update,
);
router.delete("/:id", scopeGuard, pollingStationController.remove);

export default router;

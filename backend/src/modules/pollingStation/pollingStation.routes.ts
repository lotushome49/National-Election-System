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
import { ROLES, type AuthRequest } from "../../types";
import type { Response, NextFunction } from "express";

const router = Router();

const allowReadOnlyPollingStationAccess = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (req.user?.role === ROLES.STAFF) {
    return next();
  }

  return requirePermission("MANAGE_POLLING_STATIONS")(req, res, next);
};

router.use(authenticate);
router.use(geographyLimiter);

router.get(
  "/",
  allowReadOnlyPollingStationAccess,
  scopeGuard,
  validate(pollingStationQuerySchema, "query"),
  pollingStationController.list,
);
router.get(
  "/:id",
  allowReadOnlyPollingStationAccess,
  scopeGuard,
  pollingStationController.getById,
);
router.post(
  "/",
  requirePermission("MANAGE_POLLING_STATIONS"),
  scopeGuard,
  validate(createPollingStationSchema),
  pollingStationController.create,
);
router.patch(
  "/:id",
  requirePermission("MANAGE_POLLING_STATIONS"),
  scopeGuard,
  validate(updatePollingStationSchema),
  pollingStationController.update,
);
router.delete(
  "/:id",
  requirePermission("MANAGE_POLLING_STATIONS"),
  scopeGuard,
  pollingStationController.remove,
);

export default router;

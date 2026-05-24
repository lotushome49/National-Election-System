import { Router } from "express";
import { observerController } from "./observer.controller";
import { authenticate } from "../../middleware/authenticate";
import { requirePermission, requireRole } from "../../middleware/rbac";
import { validate } from "../../middleware/validate";
import {
  createReportSchema,
  updateReportStatusSchema,
  reportQuerySchema,
} from "./observer.schema";
import { ROLES } from "../../types";
import observerEvidenceRoutes from "./observerEvidence.routes";

const router = Router();

router.use(authenticate);

// Observers and admins can list/view reports
router.get(
  "/",
  requirePermission("MANAGE_OBSERVERS"),
  validate(reportQuerySchema, "query"),
  observerController.list,
);
router.get(
  "/:id",
  requirePermission("MANAGE_OBSERVERS"),
  observerController.getById,
);

// Only observers can submit reports
router.post(
  "/",
  requireRole(ROLES.OBSERVER),
  validate(createReportSchema),
  observerController.create,
);

// Only admins can update report status
router.patch(
  "/:id/status",
  requirePermission("MANAGE_OBSERVERS"),
  validate(updateReportStatusSchema),
  observerController.updateStatus,
);

// Observer can delete their own report
router.delete(
  "/:id",
  requireRole(ROLES.OBSERVER, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  observerController.remove,
);

router.use("/evidence", observerEvidenceRoutes);

export default router;

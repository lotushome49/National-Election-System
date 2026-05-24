import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireRole } from "../../middleware/rbac";
import { ROLES } from "../../types";
import { evidenceUpload } from "./observerEvidence.upload";
import { observerEvidenceController } from "./observerEvidence.controller";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  requireRole(ROLES.OBSERVER, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  observerEvidenceController.list,
);
router.get(
  "/:id",
  requireRole(ROLES.OBSERVER, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  observerEvidenceController.getById,
);
router.post(
  "/upload",
  // Only observers may upload evidence
  requireRole(ROLES.OBSERVER),
  evidenceUpload.array("files", 10),
  observerEvidenceController.upload,
);
router.delete(
  "/:id",
  requireRole(ROLES.OBSERVER, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  observerEvidenceController.remove,
);

export default router;

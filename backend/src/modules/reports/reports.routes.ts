import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requirePermission, scopeGuard } from "../../middleware/rbac";
import { validate } from "../../middleware/validate";
import { reportsController } from "./reports.controller";
import { reportsQuerySchema } from "./reports.schema";

const router = Router();

router.use(authenticate);

router.get(
  "/overview",
  requirePermission("VIEW_RESULTS"),
  scopeGuard,
  validate(reportsQuerySchema, "query"),
  reportsController.overview,
);

router.get(
  "/export/csv",
  requirePermission("VIEW_RESULTS"),
  scopeGuard,
  validate(reportsQuerySchema, "query"),
  reportsController.exportCsv,
);

export default router;

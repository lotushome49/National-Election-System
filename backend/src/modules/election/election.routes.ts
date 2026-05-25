import { Router } from "express";
import { electionController } from "./election.controller";
import { authenticate } from "../../middleware/authenticate";
import { requirePermission } from "../../middleware/rbac";
import { validate } from "../../middleware/validate";
import {
  createElectionSchema,
  updateElectionSchema,
  transitionSchema,
  electionQuerySchema,
} from "./election.schema";

const router = Router();

router.get("/current/open", electionController.getCurrentOpen);

router.use(authenticate);

router.get(
  "/",
  validate(electionQuerySchema, "query"),
  electionController.list,
);
router.get("/:id", electionController.getById);
router.post(
  "/",
  requirePermission("MANAGE_ELECTIONS"),
  validate(createElectionSchema),
  electionController.create,
);
router.patch(
  "/:id",
  requirePermission("MANAGE_ELECTIONS"),
  validate(updateElectionSchema),
  electionController.update,
);
router.patch(
  "/:id/status",
  requirePermission("MANAGE_ELECTIONS"),
  validate(transitionSchema),
  electionController.transition,
);
router.delete(
  "/:id",
  requirePermission("MANAGE_ELECTIONS"),
  electionController.remove,
);

export default router;

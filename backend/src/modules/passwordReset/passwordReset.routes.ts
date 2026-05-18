import { Router } from "express";
import { validate } from "../../middleware/validate";
import { passwordResetController } from "./passwordReset.controller";
import {
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
} from "./passwordReset.schema";

const router = Router();

router.post(
  "/request",
  validate(passwordResetRequestSchema),
  passwordResetController.requestReset,
);
router.post(
  "/confirm",
  validate(passwordResetConfirmSchema),
  passwordResetController.confirmReset,
);
router.get("/dev-mailbox", passwordResetController.devMailbox);

export default router;

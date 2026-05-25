import { Router } from "express";
import { votingController } from "./voting.controller";
import { authenticate } from "../../middleware/authenticate";
import { requirePermission, requireRole } from "../../middleware/rbac";
import { validate } from "../../middleware/validate";
import { voteLimiter } from "../../middleware/rateLimiter";
import { castVoteSchema, verifyReceiptSchema } from "./voting.schema";
import { z } from "zod";

const router = Router();

// Public receipt verification should work without a bearer token.
router.get("/verify/:receiptHash", votingController.verifyReceipt);

router.use(authenticate);

// Voter self status for the voter hub
router.get("/me", requireRole("VOTER"), votingController.me);

// Current votable election and approved candidates for ballot rendering.
router.get(
  "/active-ballot",
  requirePermission("CAST_VOTE"),
  votingController.activeBallot,
);

// Staff issues token to a verified voter at the polling station
router.post(
  "/token",
  requirePermission("MANAGE_VOTERS"),
  validate(
    z.object({ electionId: z.string().uuid(), voterId: z.string().uuid() }),
  ),
  votingController.issueToken,
);

// Voter casts their vote
router.post(
  "/cast",
  requirePermission("CAST_VOTE"),
  voteLimiter,
  validate(castVoteSchema),
  votingController.castVote,
);

export default router;

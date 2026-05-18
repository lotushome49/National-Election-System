import { Router, Request, Response } from "express";
import { issueCsrfToken } from "../middleware/csrf";

import authRoutes from "../modules/auth/auth.routes";
import userRoutes from "../modules/user/user.routes";
import voterRoutes from "../modules/voter/voter.routes";
import electionRoutes from "../modules/election/election.routes";
import candidateRoutes from "../modules/candidate/candidate.routes";
import votingRoutes from "../modules/voting/voting.routes";
import auditRoutes from "../modules/audit/audit.routes";
import observerRoutes from "../modules/observer/observer.routes";
import resultRoutes from "../modules/result/result.routes";
import notificationRoutes from "../modules/notification/notification.routes";
import passwordResetRoutes from "../modules/passwordReset/passwordReset.routes";
import regionRoutes from "../modules/region/region.routes";
import districtRoutes from "../modules/district/district.routes";
import pollingStationRoutes from "../modules/pollingStation/pollingStation.routes";

const router = Router();

// ── Health & CSRF ─────────────────────────────────────────────────────────────
router.get("/health", (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: { status: "ok", timestamp: new Date().toISOString() },
  });
});

router.get("/csrf-token", issueCsrfToken);

// ── Module routes ─────────────────────────────────────────────────────────────
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/voters", voterRoutes);
router.use("/elections", electionRoutes);
router.use("/candidates", candidateRoutes);
router.use("/voting", votingRoutes);
router.use("/audit", auditRoutes);
router.use("/observer", observerRoutes);
router.use("/results", resultRoutes);
router.use("/notifications", notificationRoutes);
router.use("/password-reset", passwordResetRoutes);
router.use("/regions", regionRoutes);
router.use("/districts", districtRoutes);
router.use("/polling-stations", pollingStationRoutes);

export default router;

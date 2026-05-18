import { Router } from "express";
import { authController } from "./auth.controller";
import { validate } from "../../middleware/validate";
import { authenticate } from "../../middleware/authenticate";
import { authLimiter } from "../../middleware/rateLimiter";
import {
  loginSchema,
  biometricLoginSchema,
  refreshTokenSchema,
  mfaChallengeSchema,
  mfaEnrollmentVerifySchema,
  mfaDisableSchema,
} from "./auth.schema";

const router = Router();

// POST /api/v1/auth/login
router.post("/login", authLimiter, validate(loginSchema), authController.login);

// POST /api/v1/auth/login/biometric
router.post(
  "/login/biometric",
  authLimiter,
  validate(biometricLoginSchema),
  authController.biometricLogin,
);

// POST /api/v1/auth/refresh
router.post("/refresh", validate(refreshTokenSchema), authController.refresh);

// POST /api/v1/auth/mfa/challenge
router.post(
  "/mfa/challenge",
  authLimiter,
  validate(mfaChallengeSchema),
  authController.completeMfaChallenge,
);

// POST /api/v1/auth/logout  (requires valid access token)
router.post("/logout", authenticate, authController.logout);

// GET /api/v1/auth/sessions
router.get("/sessions", authenticate, authController.sessions);

// DELETE /api/v1/auth/sessions/:sessionId
router.delete(
  "/sessions/:sessionId",
  authenticate,
  authController.revokeSession,
);

// MFA self-service
router.get("/mfa/status", authenticate, authController.mfaStatus);
router.post("/mfa/enroll", authenticate, authController.beginMfaEnrollment);
router.post(
  "/mfa/verify-enrollment",
  authenticate,
  validate(mfaEnrollmentVerifySchema),
  authController.verifyMfaEnrollment,
);
router.post(
  "/mfa/disable",
  authenticate,
  validate(mfaDisableSchema),
  authController.disableMfa,
);

// GET  /api/v1/auth/me
router.get("/me", authenticate, authController.me);

export default router;

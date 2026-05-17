import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { authLimiter } from '../../middleware/rateLimiter';
import {
  loginSchema,
  biometricLoginSchema,
  refreshTokenSchema,
} from './auth.schema';

const router = Router();

// POST /api/v1/auth/login
router.post('/login', authLimiter, validate(loginSchema), authController.login);

// POST /api/v1/auth/login/biometric
router.post('/login/biometric', authLimiter, validate(biometricLoginSchema), authController.biometricLogin);

// POST /api/v1/auth/refresh
router.post('/refresh', validate(refreshTokenSchema), authController.refresh);

// POST /api/v1/auth/logout  (requires valid access token)
router.post('/logout', authenticate, authController.logout);

// GET  /api/v1/auth/me
router.get('/me', authenticate, authController.me);

export default router;

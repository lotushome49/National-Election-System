import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { sendSuccess } from '../../utils/response';
import type { AuthRequest } from '../../types';

export const authController = {
  login: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.login(req.body, req.ip ?? '');
      sendSuccess(res, result, 'Login successful');
    } catch (err) { next(err); }
  },

  biometricLogin: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.biometricLogin(req.body, req.ip ?? '');
      sendSuccess(res, result, 'Biometric login successful');
    } catch (err) { next(err); }
  },

  refresh: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.refresh(req.body, req.ip ?? '');
      sendSuccess(res, result, 'Token refreshed');
    } catch (err) { next(err); }
  },

  logout: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await authService.logout(req.user!.sub, req.ip ?? '');
      sendSuccess(res, null, 'Logged out successfully');
    } catch (err) { next(err); }
  },

  me: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      sendSuccess(res, req.user, 'Current user');
    } catch (err) { next(err); }
  },
};

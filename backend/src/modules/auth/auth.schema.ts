import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(3).max(100).trim(),
  password: z.string().min(8).max(128),
});

export const biometricLoginSchema = z.object({
  biometricHash: z.string().min(10),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(10),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z
    .string()
    .min(12)
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[a-z]/, 'Must contain lowercase')
    .regex(/[0-9]/, 'Must contain number')
    .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
});

export type LoginDto          = z.infer<typeof loginSchema>;
export type BiometricLoginDto = z.infer<typeof biometricLoginSchema>;
export type RefreshTokenDto   = z.infer<typeof refreshTokenSchema>;
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;

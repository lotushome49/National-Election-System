import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(3).max(100).trim(),
  password: z.string().min(8).max(128),
});

export const biometricLoginSchema = z.object({
  faceEmbedding: z.string().min(10),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(10),
});

const factorFields = {
  code: z.string().trim().optional(),
  recoveryCode: z.string().trim().optional(),
};

function requireFactor<T extends { code?: string; recoveryCode?: string }>(
  schema: z.ZodType<T>,
) {
  return schema.superRefine((value, ctx) => {
    if (!value.code && !value.recoveryCode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Either code or recoveryCode is required",
        path: ["code"],
      });
    }
  });
}

export const mfaChallengeSchema = requireFactor(
  z.object({
    challengeToken: z.string().min(10),
    ...factorFields,
  }),
);

export const mfaEnrollmentVerifySchema = z.object({
  setupToken: z.string().min(10),
  code: z.string().trim().length(6),
});

export const mfaDisableSchema = requireFactor(
  z.object({
    password: z.string().min(8).max(128),
    ...factorFields,
  }),
);

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z
    .string()
    .min(12)
    .regex(/[A-Z]/, "Must contain uppercase")
    .regex(/[a-z]/, "Must contain lowercase")
    .regex(/[0-9]/, "Must contain number")
    .regex(/[^A-Za-z0-9]/, "Must contain special character"),
});

export type LoginDto = z.infer<typeof loginSchema>;
export type BiometricLoginDto = z.infer<typeof biometricLoginSchema>;
export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;
export type MfaChallengeDto = z.infer<typeof mfaChallengeSchema>;
export type MfaEnrollmentVerifyDto = z.infer<typeof mfaEnrollmentVerifySchema>;
export type MfaDisableDto = z.infer<typeof mfaDisableSchema>;
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;

import { z } from "zod";

export const passwordResetRequestSchema = z.object({
  email: z.string().email(),
});

export const passwordResetConfirmSchema = z.object({
  userId: z.string().min(10),
  token: z.string().min(20),
  newPassword: z
    .string()
    .min(12)
    .regex(/[A-Z]/, "Must contain uppercase")
    .regex(/[a-z]/, "Must contain lowercase")
    .regex(/[0-9]/, "Must contain number")
    .regex(/[^A-Za-z0-9]/, "Must contain special character"),
});

export type PasswordResetRequestDto = z.infer<
  typeof passwordResetRequestSchema
>;
export type PasswordResetConfirmDto = z.infer<
  typeof passwordResetConfirmSchema
>;

import { z } from "zod";

const passwordSchema = z
  .string()
  .min(12)
  .regex(/[A-Z]/, "Must contain uppercase")
  .regex(/[a-z]/, "Must contain lowercase")
  .regex(/[0-9]/, "Must contain number")
  .regex(/[^A-Za-z0-9]/, "Must contain special character");

export const createUserSchema = z.object({
  fullName: z.string().min(2).max(255).trim(),
  username: z.string().min(3).max(100).trim(),
  email: z.string().email().optional(),
  password: passwordSchema,
  roleId: z.string().uuid(),
  assignedRegionId: z.string().uuid().optional(),
  assignedDistrictId: z.string().uuid().optional(),
});

export const updateUserSchema = z.object({
  fullName: z.string().min(2).max(255).trim().optional(),
  email: z.string().email().optional(),
  assignedRegionId: z.string().uuid().optional().nullable(),
  assignedDistrictId: z.string().uuid().optional().nullable(),
  status: z.enum(["ACTIVE", "SUSPENDED", "LOCKED"]).optional(),
});

export const userIdSchema = z.object({
  id: z.string().uuid(),
});

export const userQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  role: z.string().optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "LOCKED"]).optional(),
  regionId: z.string().uuid().optional(),
  districtId: z.string().uuid().optional(),
  search: z.string().max(100).optional(),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
export type UserQuery = z.infer<typeof userQuerySchema>;

import { z } from 'zod';

export const createDistrictSchema = z.object({
  regionId: z.string().uuid(),
  name: z.string().min(2).max(255).trim(),
  code: z.string().min(2).max(20).trim().toUpperCase(),
  description: z.string().max(2000).optional(),
});

export const updateDistrictSchema = z.object({
  regionId: z.string().uuid().optional(),
  name: z.string().min(2).max(255).trim().optional(),
  code: z.string().min(2).max(20).trim().toUpperCase().optional(),
  description: z.string().max(2000).optional(),
});

export const districtQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  regionId: z.string().uuid().optional(),
  search: z.string().max(100).optional(),
});

export type CreateDistrictDto = z.infer<typeof createDistrictSchema>;
export type UpdateDistrictDto = z.infer<typeof updateDistrictSchema>;
export type DistrictQuery = z.infer<typeof districtQuerySchema>;

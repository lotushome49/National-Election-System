import { z } from 'zod';

export const createRegionSchema = z.object({
  name: z.string().min(2).max(255).trim(),
  code: z.string().min(2).max(20).trim().toUpperCase(),
  description: z.string().max(2000).optional(),
});

export const updateRegionSchema = createRegionSchema.partial();

export const regionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(100).optional(),
});

export type CreateRegionDto = z.infer<typeof createRegionSchema>;
export type UpdateRegionDto = z.infer<typeof updateRegionSchema>;
export type RegionQuery = z.infer<typeof regionQuerySchema>;

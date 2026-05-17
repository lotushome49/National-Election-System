import { z } from 'zod';

const decimalString = z
  .union([z.string(), z.number()])
  .transform((value) => Number(value))
  .refine((value) => Number.isFinite(value), 'Must be a valid number');

export const createPollingStationSchema = z.object({
  regionId: z.string().uuid(),
  districtId: z.string().uuid(),
  name: z.string().min(2).max(255).trim(),
  code: z.string().min(2).max(30).trim().toUpperCase(),
  address: z.string().max(2000).optional(),
  latitude: decimalString.optional(),
  longitude: decimalString.optional(),
  capacity: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().optional(),
});

export const updatePollingStationSchema = z.object({
  regionId: z.string().uuid().optional(),
  districtId: z.string().uuid().optional(),
  name: z.string().min(2).max(255).trim().optional(),
  code: z.string().min(2).max(30).trim().toUpperCase().optional(),
  address: z.string().max(2000).optional(),
  latitude: decimalString.optional(),
  longitude: decimalString.optional(),
  capacity: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const pollingStationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  regionId: z.string().uuid().optional(),
  districtId: z.string().uuid().optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().max(100).optional(),
});

export type CreatePollingStationDto = z.infer<typeof createPollingStationSchema>;
export type UpdatePollingStationDto = z.infer<typeof updatePollingStationSchema>;
export type PollingStationQuery = z.infer<typeof pollingStationQuerySchema>;

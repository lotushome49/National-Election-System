import { z } from 'zod';

export const resultQuerySchema = z.object({
  page:             z.coerce.number().int().min(1).default(1),
  limit:            z.coerce.number().int().min(1).max(100).default(50),
  electionId:       z.string().uuid(),
  regionId:         z.string().uuid().optional(),
  districtId:       z.string().uuid().optional(),
  pollingStationId: z.string().uuid().optional(),
  isFinal:          z.coerce.boolean().optional(),
});

export const computeResultSchema = z.object({
  electionId: z.string().uuid(),
  isFinal:    z.boolean().default(false),
});

export type ResultQuery      = z.infer<typeof resultQuerySchema>;
export type ComputeResultDto = z.infer<typeof computeResultSchema>;

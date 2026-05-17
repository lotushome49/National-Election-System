import { z } from 'zod';

export const createReportSchema = z.object({
  electionId:       z.string().uuid(),
  pollingStationId: z.string().uuid().optional(),
  type:             z.enum(['INCIDENT', 'IRREGULARITY', 'COMPLAINT', 'GENERAL_OBSERVATION']),
  title:            z.string().min(5).max(255).trim(),
  description:      z.string().min(10).max(5000).trim(),
  evidenceUrls:     z.array(z.string().url()).max(10).optional(),
});

export const updateReportStatusSchema = z.object({
  status:     z.enum(['SUBMITTED', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED']),
  resolution: z.string().max(2000).optional(),
});

export const reportQuerySchema = z.object({
  page:             z.coerce.number().int().min(1).default(1),
  limit:            z.coerce.number().int().min(1).max(100).default(20),
  electionId:       z.string().uuid().optional(),
  pollingStationId: z.string().uuid().optional(),
  type:             z.string().optional(),
  status:           z.string().optional(),
  observerId:       z.string().uuid().optional(),
});

export type CreateReportDto      = z.infer<typeof createReportSchema>;
export type UpdateReportStatusDto = z.infer<typeof updateReportStatusSchema>;
export type ReportQuery          = z.infer<typeof reportQuerySchema>;

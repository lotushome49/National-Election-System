import { z } from 'zod';

export const createCandidateSchema = z.object({
  electionId:  z.string().uuid(),
  fullName:    z.string().min(2).max(255).trim(),
  party:       z.string().min(1).max(255).trim(),
  partyCode:   z.string().max(20).optional(),
  bio:         z.string().max(2000).optional(),
  manifesto:   z.string().max(5000).optional(),
  symbol:      z.string().max(10).optional(),
  photoUrl:    z.string().url().optional(),
  ballotOrder: z.number().int().min(1).optional(),
  regionId:    z.string().uuid().optional(),
  districtId:  z.string().uuid().optional(),
});

export const updateCandidateSchema = createCandidateSchema.omit({ electionId: true }).partial();

export const candidateStatusSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'DISQUALIFIED']),
  reason: z.string().max(500).optional(),
});

export const candidateQuerySchema = z.object({
  page:       z.coerce.number().int().min(1).default(1),
  limit:      z.coerce.number().int().min(1).max(100).default(20),
  electionId: z.string().uuid().optional(),
  status:     z.string().optional(),
  regionId:   z.string().uuid().optional(),
});

export type CreateCandidateDto = z.infer<typeof createCandidateSchema>;
export type UpdateCandidateDto = z.infer<typeof updateCandidateSchema>;
export type CandidateStatusDto = z.infer<typeof candidateStatusSchema>;
export type CandidateQuery     = z.infer<typeof candidateQuerySchema>;

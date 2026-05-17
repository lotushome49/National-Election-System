import { z } from 'zod';

export const createElectionSchema = z.object({
  title:            z.string().min(3).max(255).trim(),
  description:      z.string().max(2000).optional(),
  type:             z.enum(['PRESIDENTIAL', 'PARLIAMENTARY', 'LOCAL', 'BY_ELECTION', 'REFERENDUM']),
  nominationStart:  z.string().datetime().optional(),
  nominationEnd:    z.string().datetime().optional(),
  campaignStart:    z.string().datetime().optional(),
  campaignEnd:      z.string().datetime().optional(),
  votingStart:      z.string().datetime().optional(),
  votingEnd:        z.string().datetime().optional(),
  isNational:       z.boolean().default(true),
  maxVotesPerVoter: z.number().int().min(1).max(10).default(1),
  metadata:         z.record(z.unknown()).optional(),
});

export const updateElectionSchema = createElectionSchema.partial();

export const transitionSchema = z.object({
  status: z.enum([
    'DRAFT', 'SCHEDULED', 'NOMINATION_OPEN', 'NOMINATION_CLOSED',
    'CAMPAIGN', 'VOTING_OPEN', 'VOTING_CLOSED', 'COUNTING',
    'RESULTS_DECLARED', 'DISPUTED', 'CANCELLED',
  ]),
  reason: z.string().max(500).optional(),
});

export const electionQuerySchema = z.object({
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  type:   z.string().optional(),
});

export type CreateElectionDto = z.infer<typeof createElectionSchema>;
export type UpdateElectionDto = z.infer<typeof updateElectionSchema>;
export type TransitionDto     = z.infer<typeof transitionSchema>;
export type ElectionQuery     = z.infer<typeof electionQuerySchema>;

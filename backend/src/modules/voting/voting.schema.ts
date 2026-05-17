import { z } from 'zod';

export const castVoteSchema = z.object({
  electionId:  z.string().uuid(),
  candidateId: z.string().uuid(),
  tokenHash:   z.string().min(10, 'Voting token required'),
});

export const verifyReceiptSchema = z.object({
  receiptHash: z.string().min(10),
});

export type CastVoteDto      = z.infer<typeof castVoteSchema>;
export type VerifyReceiptDto = z.infer<typeof verifyReceiptSchema>;

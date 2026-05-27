import { z } from "zod";

export const castVoteSchema = z.object({
  electionId: z.string().uuid(),
  candidateId: z.string().uuid(),
  uniqueVoterId: z.string().min(3).max(50).trim(),
});

export const verifyAccessSchema = z.object({
  uniqueVoterId: z.string().min(3).max(50).trim(),
});

export const verifyReceiptSchema = z.object({
  receiptHash: z.string().min(10),
});

export type CastVoteDto = z.infer<typeof castVoteSchema>;
export type VerifyReceiptDto = z.infer<typeof verifyReceiptSchema>;
export type VerifyAccessDto = z.infer<typeof verifyAccessSchema>;

import { z } from "zod";

export const reportsQuerySchema = z.object({
  electionId: z.string().uuid().optional(),
});

export type ReportsQuery = z.infer<typeof reportsQuerySchema>;

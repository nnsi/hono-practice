import { z } from "zod";

export const CreateGoalRequestSchema = z.object({
  name: z.string(),
  target: z.number(),
  targetUnit: z.string(),
  startDate: z.string(),
  endDate: z.string(),
});

export type CreateGoalRequest = z.infer<typeof CreateGoalRequestSchema>;

import { z } from "zod";

export const CreateGoalRequestSchema = z.object({
  title: z.string(),
  quantity: z.number(),
  unit: z.string(),
  currentQuantity: z.number(),
  startDate: z.string(),
  dueDate: z.string(),
});

export type CreateGoalRequest = z.infer<typeof CreateGoalRequestSchema>;

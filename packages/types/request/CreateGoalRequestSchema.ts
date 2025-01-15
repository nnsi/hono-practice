import { z } from "zod";

export const CreateGoalRequestSchema = z.object({
  title: z.string(),
  quantity: z.number(),
  unit: z.string(),
  currentQuantity: z.number(),
  startDate: z.string(),
  dueDate: z.string(),
  taskIds: z.array(z.string()).optional(),
  activityIds: z.array(z.string()).optional(),
  goalIds: z.array(z.string()).optional(),
});

export type CreateGoalRequest = z.infer<typeof CreateGoalRequestSchema>;

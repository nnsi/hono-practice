import { z } from "zod";

export const UpdateGoalRequestSchema = z.object({
  title: z.string().optional(),
  quantity: z.number().optional(),
  unit: z.string().optional(),
  currentQuantity: z.number().optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  taskIds: z.array(z.string()).optional(),
  activityIds: z.array(z.string()).optional(),
  goalIds: z.array(z.string()).optional(),
});

export type UpdateGoalRequest = z.infer<typeof UpdateGoalRequestSchema>;

import { z } from "zod";

export const UpdateGoalRequestSchema = z.object({
  title: z.string().optional(),
  quantity: z.number().optional(),
  unit: z.string().optional(),
  currentQuantity: z.number().optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
});

export type UpdateGoalRequest = z.infer<typeof UpdateGoalRequestSchema>;

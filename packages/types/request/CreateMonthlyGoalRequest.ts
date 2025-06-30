import { z } from "zod";

export const CreateMonthlyGoalRequestSchema = z.object({
  activityId: z.string().uuid(),
  targetMonth: z.string().regex(/^\d{4}-\d{2}$/), // YYYY-MM format
  targetQuantity: z.number().positive(),
  description: z.string().optional(),
});

export type CreateMonthlyGoalRequest = z.infer<
  typeof CreateMonthlyGoalRequestSchema
>;

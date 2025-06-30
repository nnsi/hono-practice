import { z } from "zod";

export const UpdateMonthlyGoalRequestSchema = z.object({
  targetMonth: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(), // YYYY-MM format
  targetQuantity: z.number().positive().optional(),
  description: z.string().optional().nullable(),
});

export type UpdateMonthlyGoalRequest = z.infer<
  typeof UpdateMonthlyGoalRequestSchema
>;

import { z } from "zod";

export const UpdateDebtGoalRequestSchema = z.object({
  dailyTargetQuantity: z.number().positive().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export type UpdateDebtGoalRequest = z.infer<typeof UpdateDebtGoalRequestSchema>;
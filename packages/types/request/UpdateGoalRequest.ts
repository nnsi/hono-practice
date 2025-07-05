import { z } from "zod";

export const UpdateGoalRequestSchema = z.object({
  dailyTargetQuantity: z.number().positive().optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export type UpdateGoalRequest = z.infer<typeof UpdateGoalRequestSchema>;

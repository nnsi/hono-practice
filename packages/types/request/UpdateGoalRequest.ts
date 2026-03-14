import { z } from "zod";

export const UpdateGoalRequestSchema = z.object({
  dailyTargetQuantity: z.number().positive().optional(),
  startDate: z
    .string()
    .max(10)
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .max(10)
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  description: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
  debtCap: z.number().nonnegative().optional().nullable(),
  dayTargets: z
    .record(z.string(), z.number().nonnegative())
    .optional()
    .nullable(),
});

export type UpdateGoalRequest = z.infer<typeof UpdateGoalRequestSchema>;

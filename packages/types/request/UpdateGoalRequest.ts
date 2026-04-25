import { z } from "zod";

import { addEndDateRangeIssue, dateStringSchema } from "../dateSchemas";

export const UpdateGoalRequestSchema = z
  .object({
    dailyTargetQuantity: z.number().positive().optional(),
    startDate: dateStringSchema.optional(),
    endDate: dateStringSchema.optional().nullable(),
    description: z.string().max(500).optional().nullable(),
    isActive: z.boolean().optional(),
    debtCap: z.number().nonnegative().optional().nullable(),
    dayTargets: z
      .record(z.string(), z.number().nonnegative())
      .optional()
      .nullable(),
  })
  .superRefine((value, ctx) => {
    addEndDateRangeIssue(ctx, value.startDate, value.endDate);
  });

export type UpdateGoalRequest = z.infer<typeof UpdateGoalRequestSchema>;

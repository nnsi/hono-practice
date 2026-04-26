import { z } from "zod";

import { addEndDateRangeIssue, dateStringSchema } from "../dateSchemas";
import { dayTargetsRequestSchema } from "../dayTargetsSchema";

export const CreateGoalRequestSchema = z
  .object({
    activityId: z.string().uuid(),
    dailyTargetQuantity: z.number().positive(),
    startDate: dateStringSchema,
    endDate: dateStringSchema.optional(),
    description: z.string().max(500).optional(),
    debtCap: z.number().nonnegative().nullable().optional(),
    dayTargets: dayTargetsRequestSchema.nullable().optional(),
  })
  .superRefine((value, ctx) => {
    addEndDateRangeIssue(ctx, value.startDate, value.endDate);
  });

export type CreateGoalRequest = z.infer<typeof CreateGoalRequestSchema>;

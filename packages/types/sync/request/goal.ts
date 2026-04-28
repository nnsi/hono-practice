import { z } from "zod";

import { addEndDateRangeIssue, dateStringSchema } from "../../dateSchemas";

export const UpsertGoalRequestSchema = z
  .object({
    id: z.string().uuid(),
    activityId: z.string().uuid(),
    dailyTargetQuantity: z.number().min(0),
    startDate: dateStringSchema,
    endDate: dateStringSchema.nullable(),
    isActive: z.boolean(),
    description: z.string().max(1000),
    debtCap: z.number().min(0).nullable(),
    dayTargets: z
      .record(z.enum(["1", "2", "3", "4", "5", "6", "7"]), z.number().min(0))
      .nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    deletedAt: z.string().datetime().nullable(),
  })
  .superRefine((value, ctx) => {
    addEndDateRangeIssue(ctx, value.startDate, value.endDate);
  });

export const SyncGoalsRequestSchema = z.object({
  goals: z.array(UpsertGoalRequestSchema).max(100),
});

export type UpsertGoalRequest = z.infer<typeof UpsertGoalRequestSchema>;
export type SyncGoalsRequest = z.infer<typeof SyncGoalsRequestSchema>;

import { z } from "zod";

import { hasUniqueIds } from "./uniqueIds";

import { addEndDateRangeIssue, dateStringSchema } from "../../dateSchemas";

export const UpsertGoalFreezePeriodRequestSchema = z
  .object({
    id: z.string().uuid(),
    goalId: z.string().uuid(),
    startDate: dateStringSchema,
    endDate: dateStringSchema.nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    deletedAt: z.string().datetime().nullable(),
  })
  .superRefine((value, ctx) => {
    addEndDateRangeIssue(ctx, value.startDate, value.endDate);
  });

export const SyncGoalFreezePeriodsRequestSchema = z.object({
  freezePeriods: z
    .array(UpsertGoalFreezePeriodRequestSchema)
    .max(100)
    .refine(hasUniqueIds, "duplicate goal freeze period ids"),
});

export type UpsertGoalFreezePeriodRequest = z.infer<
  typeof UpsertGoalFreezePeriodRequestSchema
>;
export type SyncGoalFreezePeriodsRequest = z.infer<
  typeof SyncGoalFreezePeriodsRequestSchema
>;

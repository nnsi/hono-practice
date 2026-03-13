import { z } from "zod";

export const UpsertGoalFreezePeriodRequestSchema = z.object({
  id: z.string().uuid(),
  goalId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
});

export const SyncGoalFreezePeriodsRequestSchema = z.object({
  freezePeriods: z.array(UpsertGoalFreezePeriodRequestSchema).max(100),
});

export type UpsertGoalFreezePeriodRequest = z.infer<
  typeof UpsertGoalFreezePeriodRequestSchema
>;
export type SyncGoalFreezePeriodsRequest = z.infer<
  typeof SyncGoalFreezePeriodsRequestSchema
>;

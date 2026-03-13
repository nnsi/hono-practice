import { z } from "zod";

const GoalFreezePeriodRowSchema = z.object({
  id: z.string(),
  goalId: z.string(),
  userId: z.string(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

export const GetGoalFreezePeriodsV2ResponseSchema = z.object({
  freezePeriods: z.array(GoalFreezePeriodRowSchema),
});

export const SyncGoalFreezePeriodsV2ResponseSchema = z.object({
  syncedIds: z.array(z.string()),
  serverWins: z.array(GoalFreezePeriodRowSchema),
  skippedIds: z.array(z.string()),
});

export type GetGoalFreezePeriodsV2Response = z.infer<
  typeof GetGoalFreezePeriodsV2ResponseSchema
>;
export type SyncGoalFreezePeriodsResponse = z.infer<
  typeof SyncGoalFreezePeriodsV2ResponseSchema
>;

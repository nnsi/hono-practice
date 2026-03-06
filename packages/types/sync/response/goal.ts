import { z } from "zod";

const GoalRowSchema = z.object({
  id: z.string(),
  userId: z.string(),
  activityId: z.string(),
  dailyTargetQuantity: z.number(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  isActive: z.boolean(),
  description: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

const GoalWithStatsSchema = GoalRowSchema.extend({
  currentBalance: z.number(),
  totalTarget: z.number(),
  totalActual: z.number(),
});

export const GetGoalsV2ResponseSchema = z.object({
  goals: z.array(GoalWithStatsSchema),
});

export const SyncGoalsV2ResponseSchema = z.object({
  syncedIds: z.array(z.string()),
  serverWins: z.array(GoalRowSchema),
  skippedIds: z.array(z.string()),
});

export type SyncGoalsResponse = z.infer<typeof SyncGoalsV2ResponseSchema>;

export type GetGoalsV2Response = z.infer<typeof GetGoalsV2ResponseSchema>;

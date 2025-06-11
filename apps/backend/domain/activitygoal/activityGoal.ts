import { DomainValidateError } from "@backend/error";
import { z } from "zod";

import { activityIdSchema } from "../activity";
import { userIdSchema } from "../user";

import { activityGoalIdSchema } from "./activityGoalId";

const BaseActivityGoalSchema = z.object({
  id: activityGoalIdSchema,
  userId: userIdSchema,
  activityId: activityIdSchema,
  targetMonth: z.string(), // YYYY-MM形式
  targetQuantity: z.number().positive(),
  description: z.string().nullable(),
});

const NewActivityGoalSchema = BaseActivityGoalSchema.merge(
  z.object({
    type: z.literal("new"),
  }),
);

const PersistedActivityGoalSchema = BaseActivityGoalSchema.merge(
  z.object({
    type: z.literal("persisted"),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),
);

export const ActivityGoalSchema = z.discriminatedUnion("type", [
  NewActivityGoalSchema,
  PersistedActivityGoalSchema,
]);

export type ActivityGoal = z.infer<typeof ActivityGoalSchema>;
export type ActivityGoalInput = z.input<typeof ActivityGoalSchema>;

export function createActivityGoalEntity(
  params: ActivityGoalInput,
): ActivityGoal {
  const parsedEntity = ActivityGoalSchema.safeParse(params);
  if (!parsedEntity.success) {
    throw new DomainValidateError("createActivityGoalEntity: invalid params");
  }

  return parsedEntity.data;
}

// 進捗計算用のValue Object
export const GoalProgressSchema = z.object({
  currentQuantity: z.number(), // 現在の実績
  targetQuantity: z.number(), // 目標量
  progressRate: z.number(), // 進捗率（0-1）
  remainingQuantity: z.number(), // 残り必要量
  remainingDays: z.number(), // 残り日数
  dailyPaceRequired: z.number(), // 目標達成に必要な日割りペース
  isAchieved: z.boolean(), // 達成済みかどうか
});

export type GoalProgress = z.infer<typeof GoalProgressSchema>;

export function createGoalProgress(params: unknown): GoalProgress {
  const result = GoalProgressSchema.safeParse(params);
  if (!result.success) {
    throw new DomainValidateError(
      `Invalid goal progress data: ${result.error.message}`,
    );
  }
  return result.data;
}

import { DomainValidateError } from "@backend/error";
import { z } from "zod";

import { activityIdSchema } from "../activity";
import { userIdSchema } from "../user";
import { activityGoalIdSchema } from "./activityGoalId";

const BaseActivityGoalSchema = z.object({
  id: activityGoalIdSchema,
  userId: userIdSchema,
  activityId: activityIdSchema,
  dailyTargetQuantity: z.number().positive(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  isActive: z.boolean(),
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

  const goal = parsedEntity.data;

  // 終了日が設定されている場合、開始日より後でなければならない
  if (goal.endDate && goal.startDate >= goal.endDate) {
    throw new DomainValidateError(
      "createActivityGoalEntity: endDate must be after startDate",
    );
  }

  return goal;
}

// 負債計算用のValue Object
export const GoalBalanceSchema = z.object({
  currentBalance: z.number(), // 現在の残高（負=負債、正=貯金）
  totalTarget: z.number(), // 累積目標量
  totalActual: z.number(), // 累積実績
  dailyTarget: z.number(), // 1日の目標量
  daysActive: z.number(), // 稼働日数
  lastCalculatedDate: z.string(), // 最後に計算した日
});

export type GoalBalance = z.infer<typeof GoalBalanceSchema>;

export function createGoalBalance(params: unknown): GoalBalance {
  const result = GoalBalanceSchema.safeParse(params);
  if (!result.success) {
    throw new DomainValidateError(
      `Invalid goal balance data: ${result.error.message}`,
    );
  }
  return result.data;
}

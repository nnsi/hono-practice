import { DomainValidateError } from "@backend/error";
import { z } from "zod";

import { activityIdSchema } from "../activity";
import { userIdSchema } from "../user";

import { activityDebtIdSchema } from "./activityDebtId";

const BaseActivityDebtSchema = z.object({
  id: activityDebtIdSchema,
  userId: userIdSchema,
  activityId: activityIdSchema,
  dailyTargetQuantity: z.number().positive(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  isActive: z.boolean(),
  description: z.string().nullable(),
});

const NewActivityDebtSchema = BaseActivityDebtSchema.merge(
  z.object({
    type: z.literal("new"),
  }),
);

const PersistedActivityDebtSchema = BaseActivityDebtSchema.merge(
  z.object({
    type: z.literal("persisted"),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),
);

export const ActivityDebtSchema = z.discriminatedUnion("type", [
  NewActivityDebtSchema,
  PersistedActivityDebtSchema,
]);

export type ActivityDebt = z.infer<typeof ActivityDebtSchema>;
export type ActivityDebtInput = z.input<typeof ActivityDebtSchema>;

export function createActivityDebtEntity(
  params: ActivityDebtInput,
): ActivityDebt {
  const parsedEntity = ActivityDebtSchema.safeParse(params);
  if (!parsedEntity.success) {
    throw new DomainValidateError("createActivityDebtEntity: invalid params");
  }

  return parsedEntity.data;
}

// 負債計算用のValue Object
export const DebtBalanceSchema = z.object({
  currentBalance: z.number(), // 現在の残高（負=負債、正=貯金）
  totalDebt: z.number(), // 累積負債
  totalActual: z.number(), // 累積実績
  dailyTarget: z.number(), // 1日の目標量
  daysActive: z.number(), // 稼働日数
  lastCalculatedDate: z.string(), // 最後に計算した日
});

export type DebtBalance = z.infer<typeof DebtBalanceSchema>;

export function createDebtBalance(params: unknown): DebtBalance {
  const result = DebtBalanceSchema.safeParse(params);
  if (!result.success) {
    throw new DomainValidateError(
      `Invalid debt balance data: ${result.error.message}`,
      result.error,
    );
  }
  return result.data;
}

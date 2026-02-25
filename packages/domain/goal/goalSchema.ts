import { DomainValidateError } from "../errors";
import { activityIdSchema } from "../activity/activitySchema";
import { userIdSchema } from "../user/userSchema";
import { v7 } from "uuid";
import { z } from "zod";

// ActivityGoalId
export const activityGoalIdSchema = z.string().uuid().brand<"ActivityGoalId">();
export type ActivityGoalId = z.infer<typeof activityGoalIdSchema>;

export function createActivityGoalId(): ActivityGoalId {
  const parsedId = activityGoalIdSchema.safeParse(v7());
  if (!parsedId.success) {
    throw new DomainValidateError("createActivityGoalId: Invalid id");
  }
  return parsedId.data;
}

export function createActivityGoalIdFromString(id: string): ActivityGoalId {
  const result = activityGoalIdSchema.safeParse(id);
  if (!result.success) throw new DomainValidateError("Invalid ActivityGoalId format");
  return result.data;
}

// ActivityGoal
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
  z.object({ type: z.literal("new") }),
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

export function createActivityGoalEntity(params: ActivityGoalInput): ActivityGoal {
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

// GoalBalance Value Object (for schema validation)
export const GoalBalanceSchema = z.object({
  currentBalance: z.number(),
  totalTarget: z.number(),
  totalActual: z.number(),
  dailyTarget: z.number(),
  daysActive: z.number(),
  lastCalculatedDate: z.string(),
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

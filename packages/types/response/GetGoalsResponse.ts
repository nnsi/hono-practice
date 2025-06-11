import { z } from "zod";

const BaseGoalResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  activityId: z.string(),
  type: z.enum(["debt", "monthly_target"]),
  isActive: z.boolean(),
  description: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const DebtGoalResponseSchema = BaseGoalResponseSchema.extend({
  type: z.literal("debt"),
  dailyTargetQuantity: z.number(),
  startDate: z.string(),
  endDate: z.string().optional(),
  currentBalance: z.number(),
  totalDebt: z.number(),
  totalActual: z.number(),
});

const MonthlyTargetGoalResponseSchema = BaseGoalResponseSchema.extend({
  type: z.literal("monthly_target"),
  targetMonth: z.string(),
  targetQuantity: z.number(),
  currentQuantity: z.number(),
  progressRate: z.number(),
  isAchieved: z.boolean(),
});

export const GoalResponseSchema = z.discriminatedUnion("type", [
  DebtGoalResponseSchema,
  MonthlyTargetGoalResponseSchema,
]);

export const GetGoalsResponseSchema = z.object({
  goals: z.array(GoalResponseSchema),
});

export type DebtGoalResponse = z.infer<typeof DebtGoalResponseSchema>;
export type MonthlyTargetGoalResponse = z.infer<
  typeof MonthlyTargetGoalResponseSchema
>;
export type GoalResponse = z.infer<typeof GoalResponseSchema>;
export type GetGoalsResponse = z.infer<typeof GetGoalsResponseSchema>;

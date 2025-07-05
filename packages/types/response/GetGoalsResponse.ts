import { z } from "zod";

export const GoalResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  activityId: z.string(),
  isActive: z.boolean(),
  description: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  dailyTargetQuantity: z.number(),
  startDate: z.string(),
  endDate: z.string().optional(),
  currentBalance: z.number(),
  totalTarget: z.number(),
  totalActual: z.number(),
});

export const GetGoalsResponseSchema = z.object({
  goals: z.array(GoalResponseSchema),
});

export type GoalResponse = z.infer<typeof GoalResponseSchema>;
export type GetGoalsResponse = z.infer<typeof GetGoalsResponseSchema>;

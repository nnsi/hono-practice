import { z } from "zod"

export const UpsertGoalRequestSchema = z.object({
  id: z.string().uuid(),
  activityId: z.string().uuid(),
  dailyTargetQuantity: z.number().min(0),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  isActive: z.boolean(),
  description: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
})

export const SyncGoalsRequestSchema = z.object({
  goals: z.array(UpsertGoalRequestSchema).max(100),
})

export type UpsertGoalRequest = z.infer<typeof UpsertGoalRequestSchema>
export type SyncGoalsRequest = z.infer<typeof SyncGoalsRequestSchema>

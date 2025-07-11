import { z } from "zod";

export const CreateGoalRequestSchema = z.object({
  activityId: z.string().uuid(),
  dailyTargetQuantity: z.number().positive(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  description: z.string().optional(),
});

export type CreateGoalRequest = z.infer<typeof CreateGoalRequestSchema>;

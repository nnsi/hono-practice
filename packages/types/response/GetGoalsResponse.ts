import { z } from "zod";

export const GetGoalResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  quantity: z.number().nullable(),
  unit: z.string().nullable(),
  currentQuantity: z.number().nullable(),
  startDate: z.coerce.string().nullable(),
  dueDate: z.coerce.string().nullable(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const GetGoalsResponseSchema = z.array(GetGoalResponseSchema);

export type GetGoalResponse = z.infer<typeof GetGoalResponseSchema>;

export type GetGoalsResponse = z.infer<typeof GetGoalsResponseSchema>;

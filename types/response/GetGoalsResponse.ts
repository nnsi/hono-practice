import { z } from "zod";

export const GetGoalResponseSchema = z.object({});

export const GetGoalsResponseSchema = z.array(GetGoalResponseSchema);

export type GetGoalResponse = z.infer<typeof GetGoalResponseSchema>;

export type GetGoalsResponse = z.infer<typeof GetGoalsResponseSchema>;

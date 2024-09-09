import { z } from "zod";

export const GetActivitySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  options: z.array(
    z.object({
      id: z.string(),
      quantity: z.number(),
    })
  ),
});

export const GetActivitiesResponseSchema = z.array(GetActivitySchema);

export type GetActivityResponse = z.infer<typeof GetActivitySchema>;

export type GetActivitiesResponse = z.infer<typeof GetActivitiesResponseSchema>;

import { z } from "zod";

export const GetActivityResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  emoji: z.string().optional(),
  description: z.string().optional(),
  quantityUnit: z.string(),
  kinds: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
    }),
  ),
  showCombinedStats: z.boolean(),
});

export const GetActivitiesResponseSchema = z.array(GetActivityResponseSchema);

export type GetActivityResponse = z.infer<typeof GetActivityResponseSchema>;

export type GetActivitiesResponse = z.infer<typeof GetActivitiesResponseSchema>;

import { z } from "zod";

export const GetActivityResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  emoji: z.string().optional(),
  description: z.string().optional(),
  quantityUnit: z.string(),
  options: z.array(
    z.object({
      id: z.string(),
      quantity: z.number(),
    }),
  ),
  kinds: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
    }),
  ),
});

export const GetActivitiesResponseSchema = z.array(GetActivityResponseSchema);

export type GetActivityResponse = z.infer<typeof GetActivityResponseSchema>;

export type GetActivitiesResponse = z.infer<typeof GetActivitiesResponseSchema>;

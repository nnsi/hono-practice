import { z } from "zod";

export const GetActivityResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  quantityLabel: z.string(),
  options: z.array(
    z.object({
      id: z.string(),
      quantity: z.number(),
    })
  ),
});

export const GetActivitiesResponseSchema = z.array(GetActivityResponseSchema);

export type GetActivityResponse = z.infer<typeof GetActivityResponseSchema>;

export type GetActivitiesResponse = z.infer<typeof GetActivitiesResponseSchema>;

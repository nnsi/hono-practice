import { z } from "zod";

export const GetActivityStatsResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  total: z.number(),
  kinds: z.array(
    z.object({
      id: z.string().nullable(),
      name: z.string(),
      total: z.number(),
      logs: z.array(
        z.object({
          date: z.string().or(z.date()),
          quantity: z.number(),
        })
      ),
    })
  ),
});

export type GetActivityStatsResponse = z.infer<
  typeof GetActivityStatsResponseSchema
>;

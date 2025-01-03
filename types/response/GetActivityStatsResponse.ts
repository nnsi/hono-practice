import { z } from "zod";

export const GetActivityStatsResponseSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    total: z.coerce.number(),
    quantityUnit: z.string(),
    kinds: z.array(
      z.object({
        id: z.string().nullable(),
        name: z.string(),
        total: z.coerce.number(),
        logs: z.array(
          z.object({
            date: z.string().or(z.date()),
            quantity: z.coerce.number(),
          }),
        ),
      }),
    ),
  }),
);

export type GetActivityStatsResponse = z.infer<
  typeof GetActivityStatsResponseSchema
>;

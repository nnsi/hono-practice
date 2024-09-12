import { z } from "zod";

export const GetActivityLogResponseSchema = z.object({
  id: z.string(),
  date: z.coerce.string(),
  quantity: z.number().nullable(),
  activity: z.object({
    id: z.string(),
    name: z.string(),
    quantityLabel: z.string(),
  }),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  memo: z.string(),
});

export type GetActivityLogResponse = z.infer<
  typeof GetActivityLogResponseSchema
>;

export const GetActivityLogsResponseSchema = z.array(
  GetActivityLogResponseSchema
);

export type GetActivityLogsResponse = z.infer<
  typeof GetActivityLogsResponseSchema
>;

import { z } from "zod";

export const GetActivityLogResponseSchema = z.object({
  id: z.string(),
  date: z.union([z.coerce.string(), z.date()]),
  quantity: z.coerce.number().nullable(),
  activity: z.object({
    id: z.string(),
    name: z.string(),
    quantityUnit: z.string(),
    emoji: z.string().optional(),
    iconType: z.enum(["emoji", "upload"]).optional(),
    iconUrl: z.string().nullable().optional(),
    iconThumbnailUrl: z.string().nullable().optional(),
  }),
  activityKind: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .nullish(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  memo: z.string(),
});

export type GetActivityLogResponse = z.infer<
  typeof GetActivityLogResponseSchema
>;

export const GetActivityLogsResponseSchema = z.array(
  GetActivityLogResponseSchema,
);

export type GetActivityLogsResponse = z.infer<
  typeof GetActivityLogsResponseSchema
>;

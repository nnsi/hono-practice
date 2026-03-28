import { z } from "zod";

export const CreateActivityLogRequestSchema = z.object({
  id: z.string().max(100).optional(),
  quantity: z.coerce
    .number()
    .min(0, "validation:quantityMin0")
    .max(999999, "validation:quantityMax999999"),
  memo: z.string().max(1000, "validation:memoMax1000").optional(),
  date: z.string().max(10),
  activityId: z.string().max(100).optional(),
  activityKindId: z.string().max(100).optional(),
});

export type CreateActivityLogRequest = z.infer<
  typeof CreateActivityLogRequestSchema
>;

import { z } from "zod";

export const UpdateActivityLogRequestSchema = z.object({
  quantity: z.coerce
    .number()
    .min(0, "validation:quantityMin0")
    .max(999999, "validation:quantityMax999999")
    .optional(),
  memo: z.string().max(1000, "validation:memoMax1000").optional(),
  activityKindId: z.string().max(100).optional(),
});

export type UpdateActivityLogRequest = z.infer<
  typeof UpdateActivityLogRequestSchema
>;

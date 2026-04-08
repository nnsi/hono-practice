import { z } from "zod";

import { VALIDATION as V } from "../validation";

export const CreateActivityLogRequestSchema = z.object({
  id: z.string().max(100).optional(),
  quantity: z.coerce
    .number()
    .min(V.QUANTITY_MIN, "validation:quantityMin0")
    .max(V.QUANTITY_MAX, "validation:quantityMax999999"),
  memo: z.string().max(V.MEMO_MAX, "validation:memoMax1000").optional(),
  date: z.string().max(V.DATE_MAX),
  activityId: z.string().max(100).optional(),
  activityKindId: z.string().max(100).optional(),
});

export type CreateActivityLogRequest = z.infer<
  typeof CreateActivityLogRequestSchema
>;

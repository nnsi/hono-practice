import { z } from "zod";

import { dateStringSchema } from "../dateSchemas";
import { VALIDATION as V } from "../validation";

export const CreateActivityLogRequestSchema = z.object({
  id: z.string().uuid().optional().describe("クライアント側ID"),
  quantity: z.coerce
    .number()
    .min(V.QUANTITY_MIN, "validation:quantityMin0")
    .max(V.QUANTITY_MAX, "validation:quantityMax999999")
    .describe("数量（0〜999999）"),
  memo: z
    .string()
    .max(V.MEMO_MAX, "validation:memoMax1000")
    .optional()
    .describe("メモ（最大1000文字）"),
  date: dateStringSchema.describe("日付 YYYY-MM-DD"),
  activityId: z.string().uuid().describe("アクティビティID"),
  activityKindId: z
    .string()
    .uuid()
    .nullable()
    .optional()
    .describe("アクティビティ種別ID"),
});

export type CreateActivityLogRequest = z.infer<
  typeof CreateActivityLogRequestSchema
>;

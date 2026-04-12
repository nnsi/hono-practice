import { z } from "zod";

import { VALIDATION as V } from "../validation";

export const CreateActivityLogRequestSchema = z.object({
  id: z
    .string()
    .max(100)
    .optional()
    .describe("クライアント側ID（最大100文字）"),
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
  date: z.string().max(V.DATE_MAX).describe("日付 YYYY-MM-DD"),
  activityId: z.string().max(100).optional().describe("アクティビティID"),
  activityKindId: z
    .string()
    .max(100)
    .optional()
    .describe("アクティビティ種別ID"),
});

export type CreateActivityLogRequest = z.infer<
  typeof CreateActivityLogRequestSchema
>;

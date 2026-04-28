import { z } from "zod";

export const UpdateActivityLogRequestSchema = z.object({
  quantity: z.coerce
    .number()
    .min(0, "validation:quantityMin0")
    .max(999999, "validation:quantityMax999999")
    .optional()
    .describe("数量（0〜999999）"),
  memo: z
    .string()
    .max(1000, "validation:memoMax1000")
    .optional()
    .describe("メモ（最大1000文字）"),
  activityKindId: z
    .string()
    .uuid()
    .nullable()
    .optional()
    .describe("アクティビティ種別ID"),
});

export type UpdateActivityLogRequest = z.infer<
  typeof UpdateActivityLogRequestSchema
>;

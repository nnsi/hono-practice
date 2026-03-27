import { z } from "zod";

export const UpdateActivityLogRequestSchema = z.object({
  quantity: z.coerce
    .number()
    .min(0, "0以上の値を入力してください")
    .max(999999, "999999以下の値を入力してください")
    .optional(),
  memo: z.string().max(1000, "1000文字以内で入力してください").optional(),
  activityKindId: z.string().max(100).optional(),
});

export type UpdateActivityLogRequest = z.infer<
  typeof UpdateActivityLogRequestSchema
>;

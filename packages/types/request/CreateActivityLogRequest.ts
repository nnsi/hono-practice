import { z } from "zod";

export const CreateActivityLogRequestSchema = z.object({
  id: z.string().max(100).optional(),
  quantity: z.coerce
    .number()
    .min(0, "0以上の値を入力してください")
    .max(999999, "999999以下の値を入力してください"),
  memo: z.string().max(1000, "1000文字以内で入力してください").optional(),
  date: z.string().max(10),
  activityId: z.string().max(100).optional(),
  activityKindId: z.string().max(100).optional(),
});

export type CreateActivityLogRequest = z.infer<
  typeof CreateActivityLogRequestSchema
>;

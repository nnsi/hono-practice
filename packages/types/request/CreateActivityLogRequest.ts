import { z } from "zod";

export const CreateActivityLogRequestSchema = z.object({
  id: z.string().optional(), // IDフィールドを追加（オプショナル）
  quantity: z.coerce.number(),
  memo: z.string().optional(),
  date: z.string(),
  activityId: z.string().optional(),
  activityKindId: z.string().optional(),
});

export type CreateActivityLogRequest = z.infer<
  typeof CreateActivityLogRequestSchema
>;

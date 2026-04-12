import { z } from "zod";

export const updateTaskRequestSchema = z.object({
  title: z
    .string()
    .min(1, "validation:titleRequired")
    .max(20, "validation:max20Chars")
    .optional()
    .describe("タイトル（1〜20文字）"),
  activityId: z.string().uuid().nullish().describe("アクティビティID"),
  activityKindId: z.string().uuid().nullish().describe("アクティビティ種別ID"),
  quantity: z.number().min(0).max(999999).nullish().describe("目標数量"),
  memo: z
    .string()
    .max(1000, "validation:memoMax1000")
    .optional()
    .describe("メモ"),
  startDate: z.string().max(10).optional().describe("開始日"),
  dueDate: z.string().max(10).nullish().describe("期限日（nullで解除）"),
  doneDate: z
    .string()
    .max(10)
    .nullish()
    .describe("完了日（nullで未完了に戻す）"),
});

export type UpdateTaskRequest = z.infer<typeof updateTaskRequestSchema>;

import { z } from "zod";

import { addDateRangeIssue, dateStringSchema } from "../dateSchemas";

export const updateTaskRequestSchema = z
  .object({
    title: z
      .string()
      .min(1, "validation:titleRequired")
      .max(20, "validation:max20Chars")
      .optional()
      .describe("タイトル（1〜20文字）"),
    activityId: z.string().uuid().nullish().describe("アクティビティID"),
    activityKindId: z
      .string()
      .uuid()
      .nullish()
      .describe("アクティビティ種別ID"),
    quantity: z.number().min(0).max(999999).nullish().describe("目標数量"),
    memo: z
      .string()
      .max(1000, "validation:memoMax1000")
      .optional()
      .describe("メモ"),
    startDate: dateStringSchema.optional().describe("開始日"),
    dueDate: dateStringSchema.nullish().describe("期限日（nullで解除）"),
    doneDate: dateStringSchema
      .nullish()
      .describe("完了日（nullで未完了に戻す）"),
  })
  .superRefine((value, ctx) => {
    addDateRangeIssue(
      ctx,
      value.startDate,
      value.dueDate,
      "dueDate",
      "validation:dueDateBeforeStartDate",
    );
  });

export type UpdateTaskRequest = z.infer<typeof updateTaskRequestSchema>;

import { z } from "zod";

import { addDateRangeIssue, dateStringSchema } from "../dateSchemas";
import { VALIDATION as V } from "../validation";

export const createTaskRequestSchema = z
  .object({
    title: z
      .string()
      .min(1, "validation:titleRequired")
      .max(V.TASK_TITLE_MAX, "validation:max20Chars")
      .describe("タイトル（1〜20文字）"),
    activityId: z
      .string()
      .uuid()
      .optional()
      .describe("紐付けるアクティビティID"),
    activityKindId: z
      .string()
      .uuid()
      .optional()
      .describe("アクティビティ種別ID"),
    quantity: z
      .number()
      .min(V.QUANTITY_MIN)
      .max(V.QUANTITY_MAX)
      .optional()
      .describe("目標数量（0〜999999）"),
    startDate: dateStringSchema.describe("開始日 YYYY-MM-DD"),
    dueDate: dateStringSchema.optional().describe("期限日 YYYY-MM-DD"),
    memo: z
      .string()
      .max(V.MEMO_MAX, "validation:memoMax1000")
      .optional()
      .describe("メモ（最大1000文字）"),
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

export type CreateTaskRequest = z.infer<typeof createTaskRequestSchema>;

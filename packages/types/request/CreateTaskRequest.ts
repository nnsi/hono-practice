import { z } from "zod";

export const createTaskRequestSchema = z.object({
  title: z
    .string()
    .min(1, "タイトルは必須です")
    .max(20, "20文字以内で入力してください"),
  activityId: z.string().uuid().optional(),
  activityKindId: z.string().uuid().optional(),
  quantity: z.number().min(0).max(999999).optional(),
  startDate: z.string().min(1, "開始日は必須です").max(10),
  dueDate: z.string().max(10).optional(),
  memo: z.string().max(1000, "1000文字以内で入力してください").optional(),
});

export type CreateTaskRequest = z.infer<typeof createTaskRequestSchema>;

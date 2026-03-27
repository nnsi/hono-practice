import { z } from "zod";

export const updateTaskRequestSchema = z.object({
  title: z
    .string()
    .min(1, "タイトルは必須です")
    .max(20, "20文字以内で入力してください")
    .optional(),
  activityId: z.string().uuid().nullish(),
  activityKindId: z.string().uuid().nullish(),
  quantity: z.number().min(0).max(999999).nullish(),
  memo: z.string().max(1000, "1000文字以内で入力してください").optional(),
  startDate: z.string().max(10).optional(),
  dueDate: z.string().max(10).nullish(),
  doneDate: z.string().max(10).nullish(),
});

export type UpdateTaskRequest = z.infer<typeof updateTaskRequestSchema>;

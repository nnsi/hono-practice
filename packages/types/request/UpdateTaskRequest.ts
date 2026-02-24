import { z } from "zod";

export const updateTaskRequestSchema = z.object({
  title: z.string().min(1, "タイトルは必須です").max(200).optional(),
  memo: z.string().max(2000).optional(),
  startDate: z.string().max(10).optional(),
  dueDate: z.string().max(10).nullish(),
  doneDate: z.string().max(10).nullish(),
});

export type UpdateTaskRequest = z.infer<typeof updateTaskRequestSchema>;

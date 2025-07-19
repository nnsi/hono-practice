import { z } from "zod";

export const updateTaskRequestSchema = z.object({
  title: z.string().min(1, "タイトルは必須です").optional(),
  memo: z.string().optional(),
  startDate: z.string().optional(),
  dueDate: z.string().nullish(),
  doneDate: z.string().nullish(),
});

export type UpdateTaskRequest = z.infer<typeof updateTaskRequestSchema>;

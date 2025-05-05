import { z } from "zod";

export const updateTaskRequestSchema = z.object({
  title: z.string().min(1, "タイトルは必須です").optional(),
  memo: z.string().optional(),
  doneAt: z.string().date().nullish(),
});

export type UpdateTaskRequest = z.infer<typeof updateTaskRequestSchema>;

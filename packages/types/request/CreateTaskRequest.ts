import { z } from "zod";

export const createTaskRequestSchema = z.object({
  title: z.string().min(1, "タイトルは必須です").max(200),
  startDate: z.string().min(1, "開始日は必須です").max(10),
  dueDate: z.string().max(10).optional(),
  memo: z.string().max(2000).optional(),
});

export type CreateTaskRequest = z.infer<typeof createTaskRequestSchema>;

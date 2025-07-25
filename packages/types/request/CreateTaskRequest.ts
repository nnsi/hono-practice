import { z } from "zod";

export const createTaskRequestSchema = z.object({
  title: z.string().min(1, "タイトルは必須です"),
  startDate: z.string().min(1, "開始日は必須です"),
  dueDate: z.string().optional(),
  memo: z.string().optional(),
});

export type CreateTaskRequest = z.infer<typeof createTaskRequestSchema>;

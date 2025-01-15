import { z } from "zod";

export const createTaskRequestSchema = z.object({
  title: z.string().min(1, "タイトルは必須です"),
});

export type CreateTaskRequest = z.infer<typeof createTaskRequestSchema>;

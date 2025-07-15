import { z } from "zod";

export const GetTaskResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  startDate: z.string().nullable(),
  dueDate: z.string().nullable(),
  doneDate: z.string().nullable(),
  memo: z.string().nullable(),
  archivedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date().nullable(),
});

export const GetTasksResponseSchema = z.array(GetTaskResponseSchema);

export type GetTaskResponse = z.infer<typeof GetTaskResponseSchema>;

export type GetTasksResponse = z.infer<typeof GetTasksResponseSchema>;

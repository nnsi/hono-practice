import { z } from "zod";

export const GetTaskResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  done: z.boolean(),
  memo: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date().nullable(),
});

export const GetTasksResponseSchema = z.array(
  GetTaskResponseSchema.omit({ memo: true })
);

export type GetTaskResponse = z.infer<typeof GetTaskResponseSchema>;

export type GetTasksResponse = z.infer<typeof GetTasksResponseSchema>;

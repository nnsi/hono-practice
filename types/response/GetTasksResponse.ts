import { z } from "zod";

import { TaskSchema } from "../prisma/index";

export const GetTaskResponseSchema = TaskSchema.pick({
  id: true,
  title: true,
  done: true,
  memo: true,
  createdAt: true,
  updatedAt: true,
});

export const GetTasksResponseSchema = z.array(
  GetTaskResponseSchema.omit({ memo: true })
);

export type GetTaskResponse = z.infer<typeof GetTaskResponseSchema>;

export type GetTasksResponse = z.infer<typeof GetTasksResponseSchema>;

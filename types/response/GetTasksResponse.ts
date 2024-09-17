import { z } from "zod";

import { TaskSchema } from "../prisma/index";

const GetTaskResponseSchema = TaskSchema.pick({
  id: true,
  title: true,
  done: true,
  createdAt: true,
  updatedAt: true,
});

export const GetTasksResponseSchema = z.array(GetTaskResponseSchema);

export type GetTasksResponse = z.infer<typeof GetTasksResponseSchema>;

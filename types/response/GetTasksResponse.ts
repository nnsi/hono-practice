import { z } from "zod";
import { TaskSchema } from "../prisma/index";

const GetTaskResponseSchema = TaskSchema.omit({
  userId: true,
  memo: true,
});

export const GetTasksResponseSchema = z.array(GetTaskResponseSchema);

export type GetTasksResponse = z.infer<typeof GetTasksResponseSchema>;

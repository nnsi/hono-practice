import { z } from "zod";
import { TaskSchema } from "../prisma/index";

export const GetTasksResponseSchema = z.array(
  TaskSchema.omit({
    userId: true,
    memo: true,
  })
);

export type GetTasksResponse = z.infer<typeof GetTasksResponseSchema>;

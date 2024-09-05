import { z } from "zod";
import { TaskSchema } from "../prisma/index";

export const GetTasksResponseSchema = z.array(
  TaskSchema.omit({
    userId: true,
    memo: true,
    createdAt: true,
    updatedAt: true,
  }).merge(
    z.object({
      createdAt: z.string(),
      updatedAt: z.string(),
    })
  )
);

export type GetTasksResponse = z.infer<typeof GetTasksResponseSchema>;

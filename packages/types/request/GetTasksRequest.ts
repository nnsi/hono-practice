import { z } from "zod";

export const getTasksRequestSchema = z.object({
  date: z.string().date().optional(),
});

export type GetTasksRequest = z.infer<typeof getTasksRequestSchema>;

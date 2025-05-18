import { z } from "zod";

export const getTasksRequestSchema = z.object({
  date: z.coerce.date().optional(),
});

export type GetTasksRequest = z.infer<typeof getTasksRequestSchema>;

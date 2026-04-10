import { z } from "zod";

export const getTasksRequestSchema = z.object({
  date: z.iso.date().optional(),
});

export type GetTasksRequest = z.infer<typeof getTasksRequestSchema>;

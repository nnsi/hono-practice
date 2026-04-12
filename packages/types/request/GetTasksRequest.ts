import { z } from "zod";

export const getTasksRequestSchema = z.object({
  date: z.iso.date().optional().describe("YYYY-MM-DD。省略時は全タスク"),
});

export type GetTasksRequest = z.infer<typeof getTasksRequestSchema>;

import { z } from "zod";

export const getActivityLogsRequestSchema = z.object({
  date: z
    .string()
    .optional()
    .describe("YYYY-MM-DD（日）または YYYY-MM（月）。省略時は今日"),
});

export type GetActivityLogsRequest = z.infer<
  typeof getActivityLogsRequestSchema
>;

export const getActivityLogStatsRequestSchema = z.object({
  date: z.string().describe("YYYY-MM-DD（日）または YYYY-MM（月）"),
});

export type GetActivityLogStatsRequest = z.infer<
  typeof getActivityLogStatsRequestSchema
>;

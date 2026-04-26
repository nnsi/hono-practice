import { z } from "zod";

import { dateOrMonthStringSchema } from "../dateSchemas";

export const getActivityLogsRequestSchema = z.object({
  date: dateOrMonthStringSchema
    .optional()
    .describe("YYYY-MM-DD（日）または YYYY-MM（月）。省略時は今日"),
});

export type GetActivityLogsRequest = z.infer<
  typeof getActivityLogsRequestSchema
>;

export const getActivityLogStatsRequestSchema = z.object({
  date: dateOrMonthStringSchema.describe(
    "YYYY-MM-DD（日）または YYYY-MM（月）",
  ),
});

export type GetActivityLogStatsRequest = z.infer<
  typeof getActivityLogStatsRequestSchema
>;

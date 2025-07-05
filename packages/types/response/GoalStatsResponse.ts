import { z } from "zod";

const DailyRecordSchema = z.object({
  date: z.string(),
  quantity: z.union([z.number(), z.string()]).transform((val) => {
    if (typeof val === "string") {
      return Number.parseFloat(val);
    }
    return val;
  }),
  achieved: z.boolean(),
});

const StatsSchema = z.object({
  average: z.number(),
  max: z.number(),
  maxConsecutiveDays: z.number(),
  achievedDays: z.number(),
});

export const GoalStatsResponseSchema = z.object({
  goalId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  dailyRecords: z.array(DailyRecordSchema),
  stats: StatsSchema,
});

export type DailyRecord = z.infer<typeof DailyRecordSchema>;
export type Stats = z.infer<typeof StatsSchema>;
export type GoalStatsResponse = z.infer<typeof GoalStatsResponseSchema>;

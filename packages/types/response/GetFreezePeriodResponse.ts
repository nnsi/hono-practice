import { z } from "zod";

export const FreezePeriodResponseSchema = z.object({
  id: z.string(),
  goalId: z.string(),
  userId: z.string(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const GetFreezePeriodsResponseSchema = z.object({
  freezePeriods: z.array(FreezePeriodResponseSchema),
});

export type FreezePeriodResponse = z.infer<typeof FreezePeriodResponseSchema>;
export type GetFreezePeriodsResponse = z.infer<
  typeof GetFreezePeriodsResponseSchema
>;

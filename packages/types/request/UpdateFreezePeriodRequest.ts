import { z } from "zod";

import { addEndDateRangeIssue, dateStringSchema } from "../dateSchemas";

export const UpdateFreezePeriodRequestSchema = z
  .object({
    startDate: dateStringSchema.optional(),
    endDate: dateStringSchema.nullable().optional(),
  })
  .superRefine((value, ctx) => {
    addEndDateRangeIssue(ctx, value.startDate, value.endDate);
  });

export type UpdateFreezePeriodRequest = z.infer<
  typeof UpdateFreezePeriodRequestSchema
>;

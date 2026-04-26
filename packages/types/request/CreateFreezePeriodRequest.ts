import { z } from "zod";

import { addEndDateRangeIssue, dateStringSchema } from "../dateSchemas";

export const CreateFreezePeriodRequestSchema = z
  .object({
    startDate: dateStringSchema,
    endDate: dateStringSchema.nullable().optional(),
  })
  .superRefine((value, ctx) => {
    addEndDateRangeIssue(ctx, value.startDate, value.endDate);
  });

export type CreateFreezePeriodRequest = z.infer<
  typeof CreateFreezePeriodRequestSchema
>;

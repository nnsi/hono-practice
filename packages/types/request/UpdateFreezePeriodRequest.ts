import { z } from "zod";

export const UpdateFreezePeriodRequestSchema = z.object({
  startDate: z
    .string()
    .max(10)
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .max(10)
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});

export type UpdateFreezePeriodRequest = z.infer<
  typeof UpdateFreezePeriodRequestSchema
>;

import { z } from "zod";

export const CreateFreezePeriodRequestSchema = z.object({
  startDate: z
    .string()
    .max(10)
    .regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z
    .string()
    .max(10)
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});

export type CreateFreezePeriodRequest = z.infer<
  typeof CreateFreezePeriodRequestSchema
>;

import { z } from "zod";

export const CreateActivityLogRequestSchema = z.object({
  quantity: z.coerce.number().optional(),
  memo: z.string().optional(),
  date: z.coerce.date(),
});

export type CreateActivityLogRequest = z.infer<
  typeof CreateActivityLogRequestSchema
>;

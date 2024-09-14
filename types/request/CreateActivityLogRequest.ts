import { z } from "zod";

export const CreateActivityLogRequestSchema = z.object({
  quantity: z.coerce.number().optional(),
  memo: z.string().optional(),
  date: z.string(),
});

export type CreateActivityLogRequest = z.infer<
  typeof CreateActivityLogRequestSchema
>;

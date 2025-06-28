import { z } from "zod";

export const CreateActivityLogRequestSchema = z.object({
  quantity: z.coerce.number(),
  memo: z.string().optional(),
  date: z.string(),
  activityId: z.string().optional(),
  activityKindId: z.string().optional(),
});

export type CreateActivityLogRequest = z.infer<
  typeof CreateActivityLogRequestSchema
>;

import { z } from "zod";

export const CreateActivityLogRequestSchema = z.object({
  id: z.string().max(100).optional(),
  quantity: z.coerce.number(),
  memo: z.string().max(2000).optional(),
  date: z.string().max(10),
  activityId: z.string().max(100).optional(),
  activityKindId: z.string().max(100).optional(),
});

export type CreateActivityLogRequest = z.infer<
  typeof CreateActivityLogRequestSchema
>;

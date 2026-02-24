import { z } from "zod";

export const UpdateActivityLogRequestSchema = z.object({
  quantity: z.coerce.number().optional(),
  memo: z.string().max(2000).optional(),
  activityKindId: z.string().max(100).optional(),
});

export type UpdateActivityLogRequest = z.infer<
  typeof UpdateActivityLogRequestSchema
>;

import { z } from "zod";

export const UpdateActivityLogRequestSchema = z.object({
  quantity: z.coerce.number().optional(),
  memo: z.string().optional(),
  activityKindId: z.string().optional(),
});

export type UpdateActivityLogRequest = z.infer<
  typeof UpdateActivityLogRequestSchema
>;

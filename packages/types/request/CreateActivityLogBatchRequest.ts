import { z } from "zod";

import { CreateActivityLogRequestSchema } from "./CreateActivityLogRequest";

export const CreateActivityLogBatchRequestSchema = z.object({
  activityLogs: z.array(CreateActivityLogRequestSchema).min(1).max(500),
});

export type CreateActivityLogBatchRequest = z.infer<
  typeof CreateActivityLogBatchRequestSchema
>;

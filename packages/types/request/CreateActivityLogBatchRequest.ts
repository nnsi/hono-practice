import { z } from "zod";

import { CreateActivityLogRequestSchema } from "./CreateActivityLogRequest";

export const CreateActivityLogBatchRequestSchema = z.object({
  activityLogs: z
    .array(CreateActivityLogRequestSchema)
    .min(1)
    .max(500)
    .describe(
      "作成する活動ログの配列（1〜500件）。各要素は POST /activity-logs と同じ形式",
    ),
});

export type CreateActivityLogBatchRequest = z.infer<
  typeof CreateActivityLogBatchRequestSchema
>;

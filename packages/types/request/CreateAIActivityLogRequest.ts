import { z } from "zod";

import { dateStringSchema } from "../dateSchemas";

export const CreateAIActivityLogRequestSchema = z.object({
  speechText: z
    .string()
    .min(1)
    .max(1000)
    .describe("音声入力テキスト（1〜1000文字）"),
  clientDate: dateStringSchema.describe(
    "クライアントの今日（YYYY-MM-DD）。AIが相対日付を解決するために使用。必須",
  ),
});

export type CreateAIActivityLogRequest = z.infer<
  typeof CreateAIActivityLogRequestSchema
>;

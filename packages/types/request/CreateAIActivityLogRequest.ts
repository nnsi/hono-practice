import { z } from "zod";

export const CreateAIActivityLogRequestSchema = z.object({
  speechText: z
    .string()
    .min(1)
    .max(1000)
    .describe("音声入力テキスト（1〜1000文字）"),
});

export type CreateAIActivityLogRequest = z.infer<
  typeof CreateAIActivityLogRequestSchema
>;

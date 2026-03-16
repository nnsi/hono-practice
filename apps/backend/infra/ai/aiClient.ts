import { createOpenRouter } from "@openrouter/ai-sdk-provider";

export type AIClient = ReturnType<typeof createOpenRouter>;

export function newAIClient(apiKey: string): AIClient {
  return createOpenRouter({ apiKey });
}

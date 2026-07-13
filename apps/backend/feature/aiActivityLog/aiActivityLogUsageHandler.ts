import type { Logger } from "@backend/lib/logger";

import type { AIActivityLogHandler } from "./aiActivityLogHandler";

type UsageHandlerOptions = {
  consumeQuota(): Promise<void>;
  logger: Logger | undefined;
  userId: string;
  apiKeyId: string | null;
  model: string;
  now?: () => number;
};

export function newAIActivityLogUsageHandler(
  handler: AIActivityLogHandler,
  options: UsageHandlerOptions,
): AIActivityLogHandler {
  const now = options.now ?? Date.now;

  return {
    createActivityLogFromSpeech(userId, params) {
      return options.consumeQuota().then(() => {
        const startedAt = now();
        const usage = {
          feature: "aiActivityLog",
          userId: options.userId,
          apiKeyId: options.apiKeyId,
          model: options.model,
          estimatedInputTokens: Math.ceil(params.speechText.length / 4),
        };

        return handler.createActivityLogFromSpeech(userId, params).then(
          (value) => {
            options.logger?.info("AI usage", {
              ...usage,
              outcome: "success",
              durationMs: now() - startedAt,
            });
            return value;
          },
          (error) => {
            options.logger?.error("AI usage", {
              ...usage,
              outcome: "failure",
              durationMs: now() - startedAt,
              error: error instanceof Error ? error.message : String(error),
            });
            throw error;
          },
        );
      });
    },
  };
}

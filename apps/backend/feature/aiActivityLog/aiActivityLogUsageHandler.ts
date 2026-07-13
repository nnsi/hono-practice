import type { Logger } from "@backend/lib/logger";

import type { AIActivityLogHandler } from "./aiActivityLogHandler";

type UsageReservation = { release(): Promise<void> };

type UsageHandlerOptions = {
  reserve(): Promise<UsageReservation>;
  logger: Logger | undefined;
  userId: string;
  apiKeyId: string | null;
  model: string;
  now?: () => number;
};

type HandlerOutcome<T> = { ok: true; value: T } | { ok: false; error: unknown };

export function newAIActivityLogUsageHandler(
  handler: AIActivityLogHandler,
  options: UsageHandlerOptions,
): AIActivityLogHandler {
  const now = options.now ?? Date.now;

  return {
    createActivityLogFromSpeech(userId, params) {
      return options.reserve().then((reservation) => {
        const startedAt = now();
        const usage = {
          feature: "aiActivityLog",
          userId: options.userId,
          apiKeyId: options.apiKeyId,
          model: options.model,
          estimatedInputTokens: Math.ceil(params.speechText.length / 4),
        };

        return handler
          .createActivityLogFromSpeech(userId, params)
          .then(
            (value): HandlerOutcome<typeof value> => {
              options.logger?.info("AI usage", {
                ...usage,
                outcome: "success",
                durationMs: now() - startedAt,
              });
              return { ok: true, value };
            },
            (error): HandlerOutcome<never> => {
              options.logger?.error("AI usage", {
                ...usage,
                outcome: "failure",
                durationMs: now() - startedAt,
                error: error instanceof Error ? error.message : String(error),
              });
              return { ok: false, error };
            },
          )
          .then((outcome) =>
            reservation
              .release()
              .catch((error) => {
                options.logger?.error("AI concurrency release failed", {
                  ...usage,
                  error: error instanceof Error ? error.message : String(error),
                });
              })
              .then(() => {
                if (!outcome.ok) throw outcome.error;
                return outcome.value;
              }),
          );
      });
    },
  };
}

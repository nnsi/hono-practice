import type { ContentfulStatusCode } from "hono/utils/http-status";

import { AppError } from "./appError";

export type AIQuotaErrorBody = {
  error: {
    code: "AI_QUOTA_EXCEEDED" | "AI_QUOTA_UNAVAILABLE";
    message: string;
    retryAfterSeconds?: number;
  };
};

export class AIQuotaError extends AppError {
  constructor(
    public readonly body: AIQuotaErrorBody,
    status: ContentfulStatusCode,
  ) {
    super(body.error.message, status);
  }
}

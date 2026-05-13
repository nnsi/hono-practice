import type { Logger } from "@backend/lib/logger";
import {
  type RefreshToken,
  refreshTokenSchema,
} from "@packages/domain/auth/refreshTokenSchema";
import { DomainValidateError } from "@packages/domain/errors";

export function parseCombinedToken(
  combinedToken: string,
): [string, string] | null {
  const parts = combinedToken.split(".");
  return parts.length === 2 ? [parts[0], parts[1]] : null;
}

export function parseRefreshTokenOrThrow(
  raw: unknown,
  logger: Logger,
  ctx: string,
): RefreshToken {
  const parsed = refreshTokenSchema.safeParse(raw);
  if (!parsed.success) {
    logger.error(`Failed to parse refresh token (${ctx})`, {
      error: parsed.error.message,
    });
    throw new DomainValidateError(`RefreshTokenRepository.${ctx}`);
  }
  return parsed.data;
}

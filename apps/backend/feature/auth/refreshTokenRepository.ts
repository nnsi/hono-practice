import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import { hashWithSHA256 } from "@backend/lib/hash";
import { type Logger, noopLogger } from "@backend/lib/logger";
import { refreshTokens } from "@infra/drizzle/schema";
import {
  type RefreshToken,
  refreshTokenSchema,
} from "@packages/domain/auth/refreshTokenSchema";
import { DomainValidateError } from "@packages/domain/errors";
import type { UserId } from "@packages/domain/user/userSchema";
import { and, eq, isNull, lte } from "drizzle-orm";

export type RefreshTokenRepository<T = QueryExecutor> = {
  createRefreshToken(token: RefreshToken): Promise<RefreshToken>;
  getRefreshTokenByToken(token: string): Promise<RefreshToken | null>;
  revokeRefreshToken(token: RefreshToken): Promise<void>;
  revokeAndGetRefreshToken(combinedToken: string): Promise<RefreshToken | null>;
  revokeRefreshTokenAllByUserId(userId: UserId): Promise<void>;
  deleteRefreshTokensPastExpiry(): Promise<void>;
  hardDeleteRefreshTokensByUserId(userId: UserId): Promise<number>;
  withTx: (tx: T) => RefreshTokenRepository<T>;
};

export function newRefreshTokenRepository(
  db: QueryExecutor,
  logger: Logger = noopLogger,
): RefreshTokenRepository<QueryExecutor> {
  return {
    createRefreshToken: createRefreshToken(db, logger),
    getRefreshTokenByToken: getRefreshTokenByToken(db, logger),
    revokeRefreshToken: revokeRefreshToken(db),
    revokeAndGetRefreshToken: revokeAndGetRefreshToken(db),
    revokeRefreshTokenAllByUserId: revokeRefreshTokenAllByUserId(db),
    deleteRefreshTokensPastExpiry: deleteRefreshTokensPastExpiry(db),
    hardDeleteRefreshTokensByUserId: hardDeleteRefreshTokensByUserId(db),
    withTx: (tx) => newRefreshTokenRepository(tx, logger),
  };
}

function parseCombinedToken(combinedToken: string): [string, string] | null {
  const parts = combinedToken.split(".");
  return parts.length === 2 ? [parts[0], parts[1]] : null;
}

function parseOrThrow(raw: unknown, logger: Logger, ctx: string): RefreshToken {
  const parsed = refreshTokenSchema.safeParse(raw);
  if (!parsed.success) {
    logger.error(`Failed to parse refresh token (${ctx})`, {
      error: parsed.error.message,
    });
    throw new DomainValidateError(`RefreshTokenRepository.${ctx}`);
  }
  return parsed.data;
}

function hardDeleteRefreshTokensByUserId(db: QueryExecutor) {
  return async (userId: UserId): Promise<number> => {
    const result = await db
      .delete(refreshTokens)
      .where(eq(refreshTokens.userId, userId))
      .returning();
    return result.length;
  };
}

function createRefreshToken(db: QueryExecutor, logger: Logger) {
  return async (token: RefreshToken): Promise<RefreshToken> => {
    const [result] = await db.insert(refreshTokens).values(token).returning();
    return parseOrThrow(result, logger, "create");
  };
}

function getRefreshTokenByToken(db: QueryExecutor, logger: Logger) {
  return async (combinedToken: string): Promise<RefreshToken | null> => {
    const parsed = parseCombinedToken(combinedToken);
    if (!parsed) return null;
    const [selector, plainToken] = parsed;
    const [row] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.selector, selector))
      .limit(1);
    if (!row || row.revokedAt || row.deletedAt) return null;
    if ((await hashWithSHA256(plainToken)) !== row.token) return null;
    const token = parseOrThrow(row, logger, "findByToken");
    return token.expiresAt <= new Date() ? null : token;
  };
}

function revokeRefreshToken(db: QueryExecutor) {
  return async (token: RefreshToken): Promise<void> => {
    const now = new Date();
    await db
      .update(refreshTokens)
      .set({ revokedAt: now, updatedAt: now })
      .where(eq(refreshTokens.id, token.id));
  };
}

function revokeAndGetRefreshToken(db: QueryExecutor) {
  return async (combinedToken: string): Promise<RefreshToken | null> => {
    const parsed = parseCombinedToken(combinedToken);
    if (!parsed) return null;
    const [selector, plainToken] = parsed;
    const now = new Date();
    const [revoked] = await db
      .update(refreshTokens)
      .set({ revokedAt: now, updatedAt: now })
      .where(
        and(
          eq(refreshTokens.selector, selector),
          isNull(refreshTokens.revokedAt),
          isNull(refreshTokens.deletedAt),
        ),
      )
      .returning();
    if (!revoked) return null;
    if ((await hashWithSHA256(plainToken)) !== revoked.token) return null;
    const result = refreshTokenSchema.safeParse({
      ...revoked,
      revokedAt: null,
    });
    if (!result.success) return null;
    return result.data.expiresAt <= new Date() ? null : result.data;
  };
}

function revokeRefreshTokenAllByUserId(db: QueryExecutor) {
  return async (userId: UserId): Promise<void> => {
    const now = new Date();
    await db
      .update(refreshTokens)
      .set({ revokedAt: now, updatedAt: now })
      .where(eq(refreshTokens.userId, userId));
  };
}

function deleteRefreshTokensPastExpiry(db: QueryExecutor) {
  return async (): Promise<void> => {
    const now = new Date();
    await db
      .update(refreshTokens)
      .set({ deletedAt: now, updatedAt: now })
      .where(lte(refreshTokens.expiresAt, now));
  };
}

import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import { hashWithSHA256 } from "@backend/lib/hash";
import { type Logger, noopLogger } from "@backend/lib/logger";
import { refreshTokens } from "@infra/drizzle/schema";
import type { RefreshToken } from "@packages/domain/auth/refreshTokenSchema";
import type { UserId } from "@packages/domain/user/userSchema";
import { eq, lte } from "drizzle-orm";

import { parseCombinedToken, parseRefreshTokenOrThrow } from "./refreshTokenIO";
import { newRevokeAndGetRefreshToken } from "./refreshTokenRotation";

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
    revokeAndGetRefreshToken: newRevokeAndGetRefreshToken(db, logger),
    revokeRefreshTokenAllByUserId: revokeRefreshTokenAllByUserId(db),
    deleteRefreshTokensPastExpiry: deleteRefreshTokensPastExpiry(db),
    hardDeleteRefreshTokensByUserId: hardDeleteRefreshTokensByUserId(db),
    withTx: (tx) => newRefreshTokenRepository(tx, logger),
  };
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
    return parseRefreshTokenOrThrow(result, logger, "create");
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
    // rotatedAt が立っている token は rotation grace 専用の状態であり、
    // logout 等の汎用 lookup からは「既に無効化されたもの」として隠す
    if (!row || row.revokedAt || row.rotatedAt || row.deletedAt) return null;
    if ((await hashWithSHA256(plainToken)) !== row.token) return null;
    const token = parseRefreshTokenOrThrow(row, logger, "findByToken");
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

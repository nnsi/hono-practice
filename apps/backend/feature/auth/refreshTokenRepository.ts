import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import type { AuthDiagnosticObserver } from "@backend/lib/authDiagnostics";
import { hashWithSHA256 } from "@backend/lib/hash";
import { type Logger, noopLogger } from "@backend/lib/logger";
import { refreshTokens } from "@infra/drizzle/schema";
import type { RefreshToken } from "@packages/domain/auth/refreshTokenSchema";
import type { UserId } from "@packages/domain/user/userSchema";
import { and, eq, lte, or } from "drizzle-orm";

import { parseCombinedToken, parseRefreshTokenOrThrow } from "./refreshTokenIO";
import {
  findRefreshTokenForUpdate,
  withRefreshTokenUserLock,
} from "./refreshTokenLock";
import {
  type RefreshTokenRecovery,
  newPrepareRefreshTokenRecovery,
  newRecordRefreshTokenRecovery,
} from "./refreshTokenRecovery";
import { newRevokeAndGetRefreshToken } from "./refreshTokenRotation";

export type RefreshTokenRepository<T = QueryExecutor> = {
  createRefreshToken(token: RefreshToken): Promise<RefreshToken>;
  getRefreshTokenByToken(
    token: string,
    forLogout?: boolean,
  ): Promise<RefreshToken | null>;
  revokeRefreshToken(token: RefreshToken): Promise<void>;
  revokeAndGetRefreshToken(combinedToken: string): Promise<RefreshToken | null>;
  prepareRefreshTokenRecovery(
    combinedToken: string,
    operationHash: string,
  ): Promise<RefreshTokenRecovery | null>;
  recordRefreshTokenRecovery(
    parent: RefreshToken,
    operationHash: string,
    child: RefreshToken,
  ): Promise<void>;
  revokeRefreshTokenAllByUserId(userId: UserId): Promise<void>;
  deleteRefreshTokensPastExpiry(): Promise<void>;
  hardDeleteRefreshTokensByUserId(userId: UserId): Promise<number>;
  withTx: (tx: T) => RefreshTokenRepository<T>;
};

export function newRefreshTokenRepository(
  db: QueryExecutor,
  logger: Logger = noopLogger,
  observer?: AuthDiagnosticObserver,
): RefreshTokenRepository<QueryExecutor> {
  return {
    createRefreshToken: createRefreshToken(db, logger),
    getRefreshTokenByToken: getRefreshTokenByToken(db, logger),
    revokeRefreshToken: revokeRefreshToken(db),
    revokeAndGetRefreshToken: newRevokeAndGetRefreshToken(db, logger, observer),
    prepareRefreshTokenRecovery: newPrepareRefreshTokenRecovery(
      db,
      logger,
      observer,
    ),
    recordRefreshTokenRecovery: newRecordRefreshTokenRecovery(db, observer),
    revokeRefreshTokenAllByUserId: revokeRefreshTokenAllByUserId(db),
    deleteRefreshTokensPastExpiry: deleteRefreshTokensPastExpiry(db),
    hardDeleteRefreshTokensByUserId: hardDeleteRefreshTokensByUserId(db),
    withTx: (tx) => newRefreshTokenRepository(tx, logger, observer),
  };
}

function hardDeleteRefreshTokensByUserId(db: QueryExecutor) {
  return async (userId: UserId): Promise<number> => {
    const result = await withRefreshTokenUserLock(db, userId, (tx) =>
      tx
        .delete(refreshTokens)
        .where(eq(refreshTokens.userId, userId))
        .returning(),
    );
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
  return async (
    combinedToken: string,
    forLogout = false,
  ): Promise<RefreshToken | null> => {
    if (forLogout) {
      const found = await findRefreshTokenForUpdate(db, combinedToken);
      if (
        !found.row ||
        found.row.deletedAt ||
        found.row.expiresAt <= new Date()
      )
        return null;
      // A superseded parent still proves ownership of its family for logout.
      // Revoked tokens make repeated logout idempotent but never refreshable.
      return parseRefreshTokenOrThrow(found.row, logger, "logout");
    }
    const parsed = parseCombinedToken(combinedToken);
    if (!parsed) return null;
    const [selector, plainToken] = parsed;
    const [row] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.selector, selector))
      .limit(1);
    // 通常の lookup は有効な token のみを返す。logout の親 lookup は上の
    // 専用分岐で検証と user lock を行う。
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
      .where(
        and(
          eq(refreshTokens.userId, token.userId),
          or(
            eq(refreshTokens.familyId, token.familyId ?? token.id),
            eq(refreshTokens.id, token.familyId ?? token.id),
          ),
        ),
      );
  };
}

function revokeRefreshTokenAllByUserId(db: QueryExecutor) {
  return async (userId: UserId): Promise<void> => {
    const now = new Date();
    await withRefreshTokenUserLock(db, userId, async (tx) => {
      await tx
        .update(refreshTokens)
        .set({ revokedAt: now, updatedAt: now })
        .where(eq(refreshTokens.userId, userId));
    });
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

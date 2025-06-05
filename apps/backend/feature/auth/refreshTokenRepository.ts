import { DomainValidateError } from "@backend/error";
import { hashWithSHA256 } from "@backend/lib/hash";
import {
  refreshTokenSchema,
  type RefreshToken,
} from "@domain/auth/refreshToken";
import { refreshTokens } from "@infra/drizzle/schema";
import { eq } from "drizzle-orm";

import type { UserId } from "@backend/domain";
import type { QueryExecutor } from "@backend/infra/rdb/drizzle";

export type RefreshTokenRepository = {
  createRefreshToken(token: RefreshToken): Promise<RefreshToken>;
  getRefreshTokenByToken(token: string): Promise<RefreshToken | null>;
  revokeRefreshToken(token: RefreshToken): Promise<void>;
  revokeRefreshTokenAllByUserId(userId: UserId): Promise<void>;
  deleteRefreshTokensPastExpiry(): Promise<void>;
  withTx: (tx: any) => RefreshTokenRepository;
};

export function newRefreshTokenRepository(
  db: QueryExecutor,
): RefreshTokenRepository {
  return {
    createRefreshToken: createRefreshToken(db),
    getRefreshTokenByToken: getRefreshTokenByToken(db),
    revokeRefreshToken: revokeRefreshToken(db),
    revokeRefreshTokenAllByUserId: revokeRefreshTokenAllByUserId(db),
    deleteRefreshTokensPastExpiry: deleteRefreshTokensPastExpiry(db),
    withTx: (tx) => newRefreshTokenRepository(tx),
  };
}

function createRefreshToken(db: QueryExecutor) {
  return async (token: RefreshToken): Promise<RefreshToken> => {
    const [result] = await db
      .insert(refreshTokens)
      .values({
        id: token.id,
        userId: token.userId,
        selector: token.selector,
        token: token.token,
        expiresAt: token.expiresAt,
        revokedAt: token.revokedAt,
        createdAt: token.createdAt,
        updatedAt: token.updatedAt,
        deletedAt: token.deletedAt,
      })
      .returning();
    const parsedToken = refreshTokenSchema.safeParse(result);
    if (!parsedToken.success) {
      console.error(
        "Failed to parse refresh token from DB:",
        parsedToken.error,
      );
      throw new DomainValidateError(
        "RefreshTokenRepository.create: Failed to parse token from DB",
      );
    }
    return parsedToken.data;
  };
}

function getRefreshTokenByToken(db: QueryExecutor) {
  return async (combinedToken: string): Promise<RefreshToken | null> => {
    const parts = combinedToken.split(".");
    if (parts.length !== 2) {
      console.error("Invalid combined token format received:", combinedToken);
      return null;
    }
    const [selector, plainToken] = parts;
    const [storedRawToken] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.selector, selector))
      .limit(1);
    if (
      !storedRawToken ||
      storedRawToken.revokedAt ||
      storedRawToken.deletedAt
    ) {
      return null;
    }
    const hashedToken = await hashWithSHA256(plainToken);
    const isValid = hashedToken === storedRawToken.token;
    if (!isValid) {
      return null;
    }
    const parsedToken = refreshTokenSchema.safeParse(storedRawToken);
    if (!parsedToken.success) {
      console.error(
        "Failed to parse refresh token from DB after validation:",
        parsedToken.error,
      );
      throw new DomainValidateError(
        "RefreshTokenRepository.findByToken: Failed to parse valid token from DB",
      );
    }
    if (parsedToken.data.expiresAt <= new Date()) {
      return null;
    }
    return parsedToken.data;
  };
}

function revokeRefreshToken(db: QueryExecutor) {
  return async (token: RefreshToken): Promise<void> => {
    await db
      .update(refreshTokens)
      .set({
        revokedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(refreshTokens.id, token.id));
  };
}

function revokeRefreshTokenAllByUserId(db: QueryExecutor) {
  return async (userId: UserId): Promise<void> => {
    const now = new Date();
    await db
      .update(refreshTokens)
      .set({
        revokedAt: now,
        updatedAt: now,
      })
      .where(eq(refreshTokens.userId, userId));
  };
}

function deleteRefreshTokensPastExpiry(db: QueryExecutor) {
  return async (): Promise<void> => {
    const now = new Date();
    await db
      .update(refreshTokens)
      .set({
        deletedAt: now,
        updatedAt: now,
      })
      .where(eq(refreshTokens.expiresAt, now));
  };
}

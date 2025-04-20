import { DomainValidateError } from "@backend/error";
import { hashWithSHA256 } from "@backend/lib/hash";
import {
  refreshTokenSchema,
  type RefreshToken,
  type RefreshTokenInput,
} from "@domain/auth/refreshToken";
import { refreshTokens } from "@infra/drizzle/schema";
import { eq } from "drizzle-orm";
import { v7 } from "uuid";

import type { UserId } from "@backend/domain";
import type { QueryExecutor } from "@backend/infra/drizzle";

export type RefreshTokenRepository = {
  createRefreshToken(input: RefreshTokenInput): Promise<RefreshToken>;
  getRefreshTokenByToken(token: string): Promise<RefreshToken | null>;
  revokeRefreshToken(id: string): Promise<void>;
  revokeRefreshTokenAllByUserId(userId: UserId): Promise<void>;
  deleteRefreshTokensPastExpiry(): Promise<void>;
};

export function newRefreshTokenRepository(
  db: QueryExecutor,
): RefreshTokenRepository & {
  withTx: (tx: QueryExecutor) => RefreshTokenRepository;
} {
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
  return async (input: RefreshTokenInput): Promise<RefreshToken> => {
    const hashedToken = await hashWithSHA256(input.token);
    const [result] = await db
      .insert(refreshTokens)
      .values({
        id: v7(),
        userId: input.userId,
        selector: input.selector,
        token: hashedToken,
        expiresAt: input.expiresAt,
        revokedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
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
  return async (id: string): Promise<void> => {
    await db
      .update(refreshTokens)
      .set({
        revokedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(refreshTokens.id, id));
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

import { DomainValidateError } from "@backend/error";
import {
  refreshTokenSchema,
  type RefreshToken,
  type RefreshTokenInput,
} from "@domain/auth/refreshToken";
import { refreshTokens } from "@infra/drizzle/schema";
import bcrypt from "bcryptjs";
import { eq, isNull } from "drizzle-orm";

import type { UserId } from "@backend/domain";
import type { QueryExecutor } from "@backend/infra/drizzle";

export interface RefreshTokenRepository {
  create(input: RefreshTokenInput): Promise<RefreshToken>;
  findByToken(token: string): Promise<RefreshToken | null>;
  revoke(id: string): Promise<void>;
  revokeAllByUserId(userId: UserId): Promise<void>;
  deleteExpired(): Promise<void>;
  withTx(tx: QueryExecutor): RefreshTokenRepository;
}

export function newRefreshTokenRepository(
  db: QueryExecutor,
): RefreshTokenRepository {
  return {
    async create(input: RefreshTokenInput): Promise<RefreshToken> {
      // トークンをハッシュ化
      const hashedToken = await bcrypt.hash(input.token, 10);

      const [result] = await db
        .insert(refreshTokens)
        .values({
          id: crypto.randomUUID(),
          userId: input.userId,
          token: hashedToken,
          expiresAt: input.expiresAt,
          revokedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        })
        .returning();

      // DBの結果をドメインスキーマでパース
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
    },

    async findByToken(token: string): Promise<RefreshToken | null> {
      const results = await db
        .select()
        .from(refreshTokens)
        .where(isNull(refreshTokens.deletedAt));

      for (const storedRawToken of results) {
        const isValid = await bcrypt.compare(token, storedRawToken.token);
        if (isValid && storedRawToken.revokedAt === null) {
          // DBの結果をドメインスキーマでパース
          const parsedToken = refreshTokenSchema.safeParse(storedRawToken);
          if (!parsedToken.success) {
            console.error(
              "Failed to parse refresh token from DB:",
              parsedToken.error,
            );
            // エラーが見つかってもループは継続し、他のトークンを試す
            continue;
          }
          // 有効でパース成功したトークンを返す
          return parsedToken.data;
        }
      }

      return null;
    },

    async revoke(id: string): Promise<void> {
      await db
        .update(refreshTokens)
        .set({
          revokedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(refreshTokens.id, id));
    },

    async revokeAllByUserId(userId: UserId): Promise<void> {
      const now = new Date();
      await db
        .update(refreshTokens)
        .set({
          revokedAt: now,
          updatedAt: now,
        })
        .where(eq(refreshTokens.userId, userId));
    },

    async deleteExpired(): Promise<void> {
      const now = new Date();
      await db
        .update(refreshTokens)
        .set({
          deletedAt: now,
          updatedAt: now,
        })
        .where(eq(refreshTokens.expiresAt, now));
    },

    withTx(tx: QueryExecutor): RefreshTokenRepository {
      return newRefreshTokenRepository(tx);
    },
  };
}

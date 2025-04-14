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
      // トークン本体をハッシュ化
      const hashedToken = await hashWithSHA256(input.token);

      const [result] = await db
        .insert(refreshTokens)
        .values({
          id: v7(),
          userId: input.userId,
          // selector を保存
          selector: input.selector,
          // ハッシュ化されたトークンを保存
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

    async findByToken(combinedToken: string): Promise<RefreshToken | null> {
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

      // トークンが見つからない、または失効している場合は null
      if (
        !storedRawToken ||
        storedRawToken.revokedAt ||
        storedRawToken.deletedAt
      ) {
        return null;
      }

      // トークン本体のハッシュを比較
      const hashedToken = await hashWithSHA256(plainToken);
      const isValid = hashedToken === storedRawToken.token;
      if (!isValid) {
        return null; // ハッシュが一致しない
      }

      // DBの結果をドメインスキーマでパース
      const parsedToken = refreshTokenSchema.safeParse(storedRawToken);
      if (!parsedToken.success) {
        console.error(
          "Failed to parse refresh token from DB after validation:",
          parsedToken.error,
        );
        // パースエラーは予期しない問題の可能性
        throw new DomainValidateError(
          "RefreshTokenRepository.findByToken: Failed to parse valid token from DB",
        );
      }

      // 有効期限をチェック
      if (parsedToken.data.expiresAt <= new Date()) {
        // ここで期限切れトークンの削除や revoke 処理を非同期で行うことも検討できる
        return null; // 期限切れ
      }

      // 有効なトークンを返す
      return parsedToken.data;
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

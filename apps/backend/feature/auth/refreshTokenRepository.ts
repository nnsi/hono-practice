import { refreshTokens } from "@infra/drizzle/schema";
import bcrypt from "bcryptjs";
import { eq, isNull } from "drizzle-orm";

import type { QueryExecutor } from "@backend/infra/drizzle";
import type {
  RefreshToken,
  RefreshTokenInput,
} from "@domain/auth/refreshToken";

export interface RefreshTokenRepository {
  create(input: RefreshTokenInput): Promise<RefreshToken>;
  findByToken(token: string): Promise<RefreshToken | null>;
  revoke(id: string): Promise<void>;
  revokeAllByUserId(userId: string): Promise<void>;
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

      const [token] = await db
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

      return token;
    },

    async findByToken(token: string): Promise<RefreshToken | null> {
      const tokens = await db
        .select()
        .from(refreshTokens)
        .where(isNull(refreshTokens.deletedAt));

      for (const storedToken of tokens) {
        const isValid = await bcrypt.compare(token, storedToken.token);
        if (isValid && storedToken.revokedAt === null) {
          return storedToken;
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

    async revokeAllByUserId(userId: string): Promise<void> {
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

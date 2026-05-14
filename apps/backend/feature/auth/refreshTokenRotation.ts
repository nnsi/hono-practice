import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import { hashWithSHA256 } from "@backend/lib/hash";
import type { Logger } from "@backend/lib/logger";
import { refreshTokens } from "@infra/drizzle/schema";
import type { RefreshToken } from "@packages/domain/auth/refreshTokenSchema";
import { and, eq, isNull } from "drizzle-orm";

import { parseCombinedToken, parseRefreshTokenOrThrow } from "./refreshTokenIO";

// rotation の grace 窓。レスポンス取りこぼし・タブ間 race などで同じ refresh token が
// 再提示された場合に「1 旧 token → 1 救済」のみ許す。consumeGraceIfFresh で
// 救済発行と同時に hard revoke するため、無限新 token 発行 (DoS / 漏洩窓拡大) は不可。
export const REFRESH_TOKEN_ROTATION_GRACE_MS = 30_000;

export function newRevokeAndGetRefreshToken(db: QueryExecutor, logger: Logger) {
  return async (combinedToken: string): Promise<RefreshToken | null> => {
    const parsed = parseCombinedToken(combinedToken);
    if (!parsed) return null;
    const [selector, plainToken] = parsed;

    // 検証は SELECT のみで行い、ハッシュ不一致時に正規トークンを壊さないようにする
    const [row] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.selector, selector))
      .limit(1);
    if (!row || row.revokedAt || row.deletedAt) return null;
    if ((await hashWithSHA256(plainToken)) !== row.token) return null;
    const now = new Date();
    if (row.expiresAt <= now) return null;

    if (row.rotatedAt) return consumeGraceIfFresh(db, row, logger);

    // 初回 rotation: rotatedAt を CAS で刻む（並列・割込ログアウトに対する保護）
    const [stamped] = await db
      .update(refreshTokens)
      .set({ rotatedAt: now, updatedAt: now })
      .where(
        and(
          eq(refreshTokens.id, row.id),
          isNull(refreshTokens.rotatedAt),
          isNull(refreshTokens.revokedAt),
          isNull(refreshTokens.deletedAt),
        ),
      )
      .returning();
    if (stamped) return parseRefreshTokenOrThrow(stamped, logger, "rotate");

    // CAS 失敗: 並列に rotation か revoke が走った。再読み込みして grace 判定し直す
    const [reread] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.id, row.id))
      .limit(1);
    if (!reread || reread.revokedAt || reread.deletedAt) return null;
    if (!reread.rotatedAt) return null;
    return consumeGraceIfFresh(db, reread, logger);
  };
}

async function consumeGraceIfFresh(
  db: QueryExecutor,
  row: typeof refreshTokens.$inferSelect,
  logger: Logger,
): Promise<RefreshToken | null> {
  if (!row.rotatedAt) return null;
  // grace 判定と revoke スタンプは consume タイミングの fresh now を使う。
  // 並列 race で他リクエストが古い now を持っていても、ここで時計を取り直すことで
  // revokedAt < rotatedAt のような時刻逆転（監査時刻の不整合）を避ける。
  const now = new Date();
  if (
    row.rotatedAt.getTime() + REFRESH_TOKEN_ROTATION_GRACE_MS <=
    now.getTime()
  ) {
    return null;
  }
  // grace 救済の二重消費を防ぐため、新 token 発行と同時に旧 row を CAS で hard revoke
  const [revoked] = await db
    .update(refreshTokens)
    .set({ revokedAt: now, updatedAt: now })
    .where(
      and(
        eq(refreshTokens.id, row.id),
        isNull(refreshTokens.revokedAt),
        isNull(refreshTokens.deletedAt),
      ),
    )
    .returning();
  if (!revoked) return null;
  return parseRefreshTokenOrThrow(revoked, logger, "rotate-grace");
}

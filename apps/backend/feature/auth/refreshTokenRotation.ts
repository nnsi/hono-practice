import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import {
  type AuthDiagnosticObserver,
  recordAuthDiagnostic,
} from "@backend/lib/authDiagnostics";
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

export function newRevokeAndGetRefreshToken(
  db: QueryExecutor,
  logger: Logger,
  observer?: AuthDiagnosticObserver,
) {
  return async (combinedToken: string): Promise<RefreshToken | null> => {
    const reject = (
      reason:
        | "malformed"
        | "not_found"
        | "revoked"
        | "deleted"
        | "hash_mismatch"
        | "expired"
        | "race_lost",
    ) => {
      recordAuthDiagnostic(observer, { stage: "rotation", reason });
      return null;
    };
    const parsed = parseCombinedToken(combinedToken);
    if (!parsed) return reject("malformed");
    const [selector, plainToken] = parsed;

    // 検証は SELECT のみで行い、ハッシュ不一致時に正規トークンを壊さないようにする
    const [row] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.selector, selector))
      .limit(1);
    if (!row) return reject("not_found");
    if (row.revokedAt) return reject("revoked");
    if (row.deletedAt) return reject("deleted");
    if ((await hashWithSHA256(plainToken)) !== row.token)
      return reject("hash_mismatch");
    const now = new Date();
    if (row.expiresAt <= now) return reject("expired");

    if (row.rotatedAt) return consumeGraceIfFresh(db, row, logger, observer);

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
    if (stamped) {
      const token = parseRefreshTokenOrThrow(stamped, logger, "rotate");
      recordAuthDiagnostic(observer, { stage: "rotation", reason: "rotated" });
      return token;
    }

    // CAS 失敗: 並列に rotation か revoke が走った。再読み込みして grace 判定し直す
    const [reread] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.id, row.id))
      .limit(1);
    if (!reread || reread.revokedAt || reread.deletedAt)
      return reject("race_lost");
    if (!reread.rotatedAt) return reject("race_lost");
    return consumeGraceIfFresh(db, reread, logger, observer);
  };
}

async function consumeGraceIfFresh(
  db: QueryExecutor,
  row: typeof refreshTokens.$inferSelect,
  logger: Logger,
  observer?: AuthDiagnosticObserver,
): Promise<RefreshToken | null> {
  if (!row.rotatedAt) {
    recordAuthDiagnostic(observer, { stage: "rotation", reason: "race_lost" });
    return null;
  }
  // grace 判定と revoke スタンプは consume タイミングの fresh now を使う。
  // 並列 race で他リクエストが古い now を持っていても、ここで時計を取り直すことで
  // revokedAt < rotatedAt のような時刻逆転（監査時刻の不整合）を避ける。
  const now = new Date();
  if (
    row.rotatedAt.getTime() + REFRESH_TOKEN_ROTATION_GRACE_MS <=
    now.getTime()
  ) {
    recordAuthDiagnostic(observer, {
      stage: "rotation",
      reason: "grace_expired",
    });
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
  if (!revoked) {
    recordAuthDiagnostic(observer, { stage: "rotation", reason: "race_lost" });
    return null;
  }
  const token = parseRefreshTokenOrThrow(revoked, logger, "rotate-grace");
  recordAuthDiagnostic(observer, { stage: "rotation", reason: "grace_used" });
  return token;
}

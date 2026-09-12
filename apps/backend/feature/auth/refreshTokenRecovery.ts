import { AppError, AuthError } from "@backend/error";
import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import {
  type AuthDiagnosticObserver,
  recordAuthDiagnostic,
} from "@backend/lib/authDiagnostics";
import type { Logger } from "@backend/lib/logger";
import { refreshTokens } from "@infra/drizzle/schema";
import type { RefreshToken } from "@packages/domain/auth/refreshTokenSchema";
import type { AuthServerDiagnostic } from "@packages/types/authDiagnostics";
import { and, eq, isNull } from "drizzle-orm";

import { parseRefreshTokenOrThrow } from "./refreshTokenIO";
import { findRefreshTokenForUpdate } from "./refreshTokenLock";
import { REFRESH_TOKEN_ROTATION_GRACE_MS } from "./refreshTokenRotation";

export type RefreshTokenRecovery =
  | { type: "rotate"; token: RefreshToken }
  | {
      type: "replay";
      token: RefreshToken;
      child: RefreshToken;
      presentedChild: boolean;
    };

export function newPrepareRefreshTokenRecovery(
  db: QueryExecutor,
  logger: Logger,
  observer?: AuthDiagnosticObserver,
) {
  return async (
    combinedToken: string,
    operationHash: string,
  ): Promise<RefreshTokenRecovery | null> => {
    const reject = (reason: AuthServerDiagnostic["reason"]) => {
      recordAuthDiagnostic(observer, { stage: "rotation", reason });
      return null;
    };
    const found = await findRefreshTokenForUpdate(db, combinedToken);
    if (!found.row) return reject(found.reason);
    const row = found.row;
    if (row.revokedAt) return reject("revoked");
    if (row.deletedAt) return reject("deleted");
    const now = new Date();
    if (row.expiresAt <= now) return reject("expired");
    const familyId = row.familyId ?? row.id;
    const [operation] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.rotationOperationHash, operationHash))
      .limit(1);

    if (operation) {
      // A nonce never authenticates a session by itself. Both the presented
      // token and the recorded parent/child relationship must match.
      if (
        operation.userId !== row.userId ||
        (operation.familyId ?? operation.id) !== familyId ||
        (row.id !== operation.id && row.id !== operation.rotationChildId)
      ) {
        reject("operation_mismatch");
        // Login may replace the HttpOnly cookie before the client clears its
        // old operation. Only a current credential permits changing the nonce;
        // consumed parents must still prove their own recorded operation.
        if (!row.rotatedAt && !row.rotationOperationHash)
          throw new AppError("refresh operation conflict", 409);
        return null;
      }
      const presentedChild = row.id === operation.rotationChildId;
      if (operation.revokedAt || (!presentedChild && operation.deletedAt))
        return reject("recovery_closed");
      if (
        !presentedChild &&
        (!operation.rotationRecoveryExpiresAt ||
          operation.rotationRecoveryExpiresAt <= now)
      )
        return reject("recovery_expired");
      if (!operation.rotationChildId) return reject("recovery_closed");
      const [child] = await db
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.id, operation.rotationChildId))
        .limit(1);
      if (
        !child ||
        child.userId !== row.userId ||
        (child.familyId ?? child.id) !== familyId ||
        child.rotatedAt ||
        child.revokedAt ||
        child.deletedAt ||
        child.expiresAt <= now
      )
        return reject("recovery_closed");
      recordAuthDiagnostic(observer, {
        stage: "rotation",
        reason: "operation_replayed",
      });
      return {
        type: "replay",
        token: parseRefreshTokenOrThrow(operation, logger, "recovery-parent"),
        child: parseRefreshTokenOrThrow(child, logger, "recovery-child"),
        presentedChild,
      };
    }

    if (row.rotationOperationHash) return reject("operation_mismatch");
    // During rollout a legacy rotation may already have occurred. Its one
    // remaining grace rescue can establish an operation, after which legacy
    // requests cannot issue another child from this parent.
    if (
      row.rotatedAt &&
      row.rotatedAt.getTime() + REFRESH_TOKEN_ROTATION_GRACE_MS <= now.getTime()
    )
      return reject("grace_expired");
    recordAuthDiagnostic(observer, {
      stage: "rotation",
      reason: row.rotatedAt ? "grace_used" : "rotated",
    });
    return {
      type: "rotate",
      token: parseRefreshTokenOrThrow(row, logger, "recovery-start"),
    };
  };
}

export function newRecordRefreshTokenRecovery(
  db: QueryExecutor,
  observer?: AuthDiagnosticObserver,
) {
  return async (
    parent: RefreshToken,
    operationHash: string,
    child: RefreshToken,
  ): Promise<void> => {
    const now = new Date();
    const [result] = await db
      .update(refreshTokens)
      .set({
        familyId: parent.familyId ?? parent.id,
        rotatedAt: parent.rotatedAt ?? now,
        rotationOperationHash: operationHash,
        rotationChildId: child.id,
        rotationRecoveryExpiresAt: parent.expiresAt,
        updatedAt: now,
      })
      .where(
        and(
          eq(refreshTokens.id, parent.id),
          isNull(refreshTokens.rotationOperationHash),
          isNull(refreshTokens.revokedAt),
          isNull(refreshTokens.deletedAt),
        ),
      )
      .returning();
    if (!result) {
      recordAuthDiagnostic(observer, { reason: "race_lost" });
      throw new AuthError("invalid refresh token");
    }
  };
}

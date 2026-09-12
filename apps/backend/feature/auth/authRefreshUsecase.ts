import { AppError, AuthError } from "@backend/error";
import type { TransactionRunner } from "@backend/infra/rdb/db";
import {
  type AuthDiagnosticObserver,
  recordAuthDiagnostic,
} from "@backend/lib/authDiagnostics";
import { hashWithSHA256 } from "@backend/lib/hash";
import type { Tracer } from "@backend/lib/tracer";
import { createRefreshToken } from "@packages/domain/auth/refreshTokenSchema";

import type { UserRepository } from "../user";
import { generateAccessToken, generateRefreshToken } from "./authTokenUtils";
import type { AuthOutput } from "./authUsecaseTypes";
import { deriveRefreshOperationSecret } from "./refreshOperationSecret";
import type { RefreshTokenRepository } from "./refreshTokenRepository";

export function rotateRefreshToken(
  refreshTokenRepo: RefreshTokenRepository,
  userRepo: UserRepository,
  txRunner: TransactionRunner,
  jwtSecret: string,
  jwtAudience: string,
  tracer: Tracer,
  observer?: AuthDiagnosticObserver,
) {
  return async (
    combinedToken: string,
    operationId?: string,
  ): Promise<AuthOutput> => {
    recordAuthDiagnostic(observer, {
      stage: "rotation",
      rotationCommitted: false,
    });
    try {
      const operationHash = operationId
        ? await hashWithSHA256(`actiko/refresh-operation/id/v1\n${operationId}`)
        : undefined;
      const result = await txRunner.run(
        [refreshTokenRepo, userRepo],
        async (tx) => {
          const recovery = operationHash
            ? await tracer.span("db.prepareRefreshTokenRecovery", () =>
                tx.prepareRefreshTokenRecovery(combinedToken, operationHash),
              )
            : null;
          const storedToken = operationHash
            ? recovery?.token
            : await tracer.span("db.revokeAndGetRefreshToken", () =>
                tx.revokeAndGetRefreshToken(combinedToken),
              );
          if (!storedToken) throw new AuthError("invalid refresh token");
          recordAuthDiagnostic(observer, { stage: "user_lookup" });
          const user = await tracer.span("db.getUserById", () =>
            tx.getUserById(storedToken.userId),
          );
          if (!user) {
            recordAuthDiagnostic(observer, { reason: "user_not_found" });
            throw new AuthError("invalid refresh token");
          }

          recordAuthDiagnostic(observer, { stage: "token_issue" });
          const accessToken = await generateAccessToken(
            jwtSecret,
            jwtAudience,
            user.id,
          );
          if (recovery?.type === "replay" && operationId) {
            const { child } = recovery;
            let refreshToken = combinedToken;
            if (!recovery.presentedChild) {
              const plain = await deriveRefreshOperationSecret(
                jwtSecret,
                operationId,
                child.selector,
              );
              if ((await hashWithSHA256(plain)) !== child.token) {
                // Secret rotation must not turn an unavailable recovery key into
                // a permanent credential rejection. The presented child can still ACK.
                throw new AppError(
                  "refresh recovery temporarily unavailable",
                  503,
                );
              }
              refreshToken = `${child.selector}.${plain}`;
            }
            return {
              accessToken,
              refreshToken,
              refreshTokenExpiresAt: child.expiresAt,
              userId: user.id,
              user,
            };
          }

          const generated = generateRefreshToken();
          const plain = operationId
            ? await deriveRefreshOperationSecret(
                jwtSecret,
                operationId,
                generated.selector,
              )
            : generated.plainRefreshToken;
          const child = createRefreshToken({
            userId: storedToken.userId,
            familyId: storedToken.familyId ?? storedToken.id,
            selector: generated.selector,
            token: await hashWithSHA256(plain),
            expiresAt: generated.expiresAt,
          });
          recordAuthDiagnostic(observer, { stage: "token_persist" });
          if (operationHash) {
            await tx.recordRefreshTokenRecovery(
              storedToken,
              operationHash,
              child,
            );
          }
          await tracer.span("db.createRefreshToken", () =>
            tx.createRefreshToken(child),
          );
          return {
            accessToken,
            refreshToken: `${child.selector}.${plain}`,
            refreshTokenExpiresAt: child.expiresAt,
            userId: storedToken.userId,
            user,
          };
        },
      );
      recordAuthDiagnostic(observer, { rotationCommitted: true });
      return result;
    } catch (error) {
      if (
        error instanceof AuthError &&
        error.status === 401 &&
        error.message === "invalid refresh token"
      )
        throw new AuthError("invalid refresh token");
      if (
        error instanceof AppError &&
        error.status === 409 &&
        error.message === "refresh operation conflict"
      )
        throw new AppError("refresh operation conflict", 409);
      recordAuthDiagnostic(observer, { reason: "rotation_failed" });
      // Drizzle errors include SQL parameters in message/cause. Only fresh,
      // fixed errors may cross this boundary into HTTP and request logging.
      throw new AppError("refresh temporarily unavailable", 503);
    }
  };
}

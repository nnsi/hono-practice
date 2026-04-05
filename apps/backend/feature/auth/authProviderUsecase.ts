import { AppError, AuthError } from "@backend/error";
import type { TransactionRunner } from "@backend/infra/rdb/db";
import { hashWithSHA256 } from "@backend/lib/hash";
import type { Tracer } from "@backend/lib/tracer";
import { createRefreshToken } from "@packages/domain/auth/refreshTokenSchema";
import {
  type Provider,
  createUserProviderEntity,
  createUserProviderId,
} from "@packages/domain/auth/userProviderSchema";
import { createUserConsent } from "@packages/domain/user/userConsentSchema";
import { type UserId, createUserId } from "@packages/domain/user/userSchema";

import type { UserConsentRepository, UserRepository } from "../user";
import { generateAccessToken, generateRefreshToken } from "./authTokenUtils";
import type {
  AuthOutput,
  OAuthConsents,
  OAuthVerifierMap,
} from "./authUsecaseTypes";
import type { OIDCPayload } from "./oauthVerify";
import type { RefreshTokenRepository } from "./refreshTokenRepository";
import type { UserProviderRepository } from "./userProviderRepository";

export function loginWithProvider(
  userRepo: UserRepository,
  refreshTokenRepo: RefreshTokenRepository,
  userProviderRepo: UserProviderRepository,
  userConsentRepo: UserConsentRepository,
  txRunner: TransactionRunner,
  jwtSecret: string,
  jwtAudience: string,
  oauthVerifiers: OAuthVerifierMap,
  tracer: Tracer,
) {
  return async (
    provider: Provider,
    credential: string,
    clientId: string | string[],
    consents?: OAuthConsents,
  ): Promise<AuthOutput> => {
    const verifier = oauthVerifiers[provider];
    if (!verifier) throw new AppError("未対応のプロバイダーです", 400);
    const payload: OIDCPayload = await tracer.span(
      `ext.${provider}.verify`,
      () => verifier(credential, clientId),
    );

    if (!payload.sub) throw new AuthError("Missing 'sub' in token payload");
    if (!payload.email) throw new AuthError("Missing 'email' in token payload");

    const providerUserId = payload.sub;
    const name = payload.name ?? `User_${providerUserId.substring(0, 8)}`;

    const existingProvider = await tracer.span(
      "db.findUserProviderByIdAndProvider",
      () =>
        userProviderRepo.findUserProviderByIdAndProvider(
          provider,
          providerUserId,
        ),
    );

    let userId: UserId;
    if (existingProvider) {
      userId = existingProvider.userId;
    } else {
      if (!consents) {
        throw new AppError(
          "consents are required for new user registration",
          400,
        );
      }
      userId = createUserId();
      await tracer.span("db.createUser.withConsentsAndProvider", () =>
        txRunner.run(
          [userRepo, userProviderRepo, userConsentRepo],
          async (tx) => {
            await tx.createUser({
              id: userId,
              loginId: `${provider}|${providerUserId}`,
              name: name,
              password: null,
              type: "new",
            });
            await tx.createUserProvider(
              createUserProviderEntity({
                id: createUserProviderId(),
                userId,
                provider,
                providerId: providerUserId,
                type: "new",
              }),
            );
            const confirmedAt = new Date();
            await tx.createUserConsents([
              createUserConsent(
                { userId, type: "age", version: null },
                confirmedAt,
              ),
              createUserConsent(
                { userId, type: "terms", version: consents.terms },
                confirmedAt,
              ),
              createUserConsent(
                { userId, type: "privacy", version: consents.privacy },
                confirmedAt,
              ),
            ]);
          },
        ),
      );
    }

    const accessToken = await generateAccessToken(
      jwtSecret,
      jwtAudience,
      userId,
    );
    const { selector, plainRefreshToken, expiresAt } = generateRefreshToken();
    const hashedToken = await hashWithSHA256(plainRefreshToken);
    await tracer.span("db.createRefreshToken", () =>
      refreshTokenRepo.createRefreshToken(
        createRefreshToken({
          userId,
          selector,
          token: hashedToken,
          expiresAt,
        }),
      ),
    );
    const refreshToken = `${selector}.${plainRefreshToken}`;

    return { accessToken, refreshToken, userId };
  };
}

export function linkProvider(
  userProviderRepo: UserProviderRepository,
  oauthVerifiers: OAuthVerifierMap,
  tracer: Tracer,
) {
  return async (
    userId: UserId,
    provider: Provider,
    credential: string,
    clientId: string | string[],
  ): Promise<void> => {
    const verifier = oauthVerifiers[provider];
    if (!verifier) throw new AppError("未対応のプロバイダーです", 400);
    const payload: OIDCPayload = await tracer.span(
      `ext.${provider}.verify`,
      () => verifier(credential, clientId),
    );
    if (!payload.sub)
      throw new AuthError("Missing 'sub' (subject) in token payload");
    if (!payload.email) throw new AuthError("Missing 'email' in token payload");

    const providerUserId = payload.sub;
    const existingProvider = await tracer.span(
      "db.findUserProviderByIdAndProvider",
      () =>
        userProviderRepo.findUserProviderByIdAndProvider(
          provider,
          providerUserId,
        ),
    );
    if (existingProvider) {
      if (existingProvider.userId !== userId) {
        throw new AppError(
          "このアカウントは他のユーザーに紐付けられています",
          400,
        );
      }
      await tracer.span("db.softDeleteUserProvider", () =>
        userProviderRepo.softDeleteUserProvider(userId, provider),
      );
    }

    await tracer.span("db.createUserProvider", () =>
      userProviderRepo.createUserProvider(
        createUserProviderEntity({
          id: createUserProviderId(),
          userId,
          provider,
          providerId: providerUserId,
          email: payload.email,
          type: "new",
        }),
      ),
    );
  };
}

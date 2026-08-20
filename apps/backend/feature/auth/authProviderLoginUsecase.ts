import { AppError } from "@backend/error";
import type { TransactionRunner } from "@backend/infra/rdb/db";
import { hashWithSHA256 } from "@backend/lib/hash";
import type { Tracer } from "@backend/lib/tracer";
import { createRefreshToken } from "@packages/domain/auth/refreshTokenSchema";
import type { Provider } from "@packages/domain/auth/userProviderSchema";
import type { UserId } from "@packages/domain/user/userSchema";

import type { UserConsentRepository, UserRepository } from "../user";
import { registerProviderUser } from "./authProviderRegistration";
import { verifyProviderIdentity } from "./authProviderVerifier";
import { generateAccessToken, generateRefreshToken } from "./authTokenUtils";
import type {
  AuthOutput,
  OAuthConsents,
  OAuthVerifierMap,
} from "./authUsecaseTypes";
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
    const payload = await verifyProviderIdentity(
      provider,
      credential,
      clientId,
      oauthVerifiers,
      tracer,
    );
    const providerUserId = payload.sub;
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
      userId = await registerProviderUser(
        { userRepo, userProviderRepo, userConsentRepo, txRunner, tracer },
        {
          provider,
          providerUserId,
          name: payload.name ?? `User_${providerUserId.substring(0, 8)}`,
          consents,
        },
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
        createRefreshToken({ userId, selector, token: hashedToken, expiresAt }),
      ),
    );

    return {
      accessToken,
      refreshToken: `${selector}.${plainRefreshToken}`,
      userId,
    };
  };
}

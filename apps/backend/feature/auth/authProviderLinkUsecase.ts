import { AppError, ConflictError } from "@backend/error";
import type { Tracer } from "@backend/lib/tracer";
import {
  type Provider,
  createUserProviderEntity,
  createUserProviderId,
} from "@packages/domain/auth/userProviderSchema";
import type { UserId } from "@packages/domain/user/userSchema";

import { verifyProviderIdentity } from "./authProviderVerifier";
import type { OAuthVerifierMap } from "./authUsecaseTypes";
import type { UserProviderRepository } from "./userProviderRepository";

const ALREADY_LINKED_MESSAGE =
  "このアカウントは他のユーザーに紐付けられています";

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
    const payload = await verifyProviderIdentity(
      provider,
      credential,
      clientId,
      oauthVerifiers,
      tracer,
    );
    const existingProvider = await tracer.span(
      "db.findUserProviderByIdAndProvider",
      () =>
        userProviderRepo.findUserProviderByIdAndProvider(provider, payload.sub),
    );
    if (existingProvider) {
      if (existingProvider.userId !== userId) {
        throw new AppError(ALREADY_LINKED_MESSAGE, 400);
      }
      return;
    }

    await tracer
      .span("db.createUserProvider", () =>
        userProviderRepo.createUserProvider(
          createUserProviderEntity({
            id: createUserProviderId(),
            userId,
            provider,
            providerId: payload.sub,
            email: payload.email,
            type: "new",
          }),
        ),
      )
      .catch(async (error) => {
        if (!(error instanceof ConflictError)) throw error;
        const winner = await userProviderRepo.findUserProviderByIdAndProvider(
          provider,
          payload.sub,
        );
        if (!winner || winner.userId !== userId) {
          throw new AppError(ALREADY_LINKED_MESSAGE, 400);
        }
      });
  };
}

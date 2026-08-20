import { ConflictError } from "@backend/error";
import type { TransactionRunner } from "@backend/infra/rdb/db";
import type { Tracer } from "@backend/lib/tracer";
import {
  type Provider,
  createUserProviderEntity,
  createUserProviderId,
} from "@packages/domain/auth/userProviderSchema";
import { createUserConsent } from "@packages/domain/user/userConsentSchema";
import { type UserId, createUserId } from "@packages/domain/user/userSchema";

import type { UserConsentRepository, UserRepository } from "../user";
import type { OAuthConsents } from "./authUsecaseTypes";
import type { UserProviderRepository } from "./userProviderRepository";

type RegistrationDependencies = {
  userRepo: UserRepository;
  userProviderRepo: UserProviderRepository;
  userConsentRepo: UserConsentRepository;
  txRunner: TransactionRunner;
  tracer: Tracer;
};

type RegistrationInput = {
  provider: Provider;
  providerUserId: string;
  name: string;
  consents: OAuthConsents;
};

export function registerProviderUser(
  dependencies: RegistrationDependencies,
  input: RegistrationInput,
): Promise<UserId> {
  const userId = createUserId();
  const registration = dependencies.tracer.span(
    "db.createUser.withConsentsAndProvider",
    () =>
      dependencies.txRunner.run(
        [
          dependencies.userRepo,
          dependencies.userProviderRepo,
          dependencies.userConsentRepo,
        ],
        async (tx) => {
          await tx.createUser({
            id: userId,
            loginId: `${input.provider}|${input.providerUserId}`,
            name: input.name,
            password: null,
            type: "new",
          });
          await tx.createUserProvider(
            createUserProviderEntity({
              id: createUserProviderId(),
              userId,
              provider: input.provider,
              providerId: input.providerUserId,
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
              { userId, type: "terms", version: input.consents.terms },
              confirmedAt,
            ),
            createUserConsent(
              { userId, type: "privacy", version: input.consents.privacy },
              confirmedAt,
            ),
          ]);
        },
      ),
  );

  return registration.then(
    () => userId,
    async (error) => {
      if (!(error instanceof ConflictError)) throw error;
      const winner =
        await dependencies.userProviderRepo.findUserProviderByIdAndProvider(
          input.provider,
          input.providerUserId,
        );
      if (!winner) throw error;
      return winner.userId;
    },
  );
}

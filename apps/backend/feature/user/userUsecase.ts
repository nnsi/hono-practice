import { ConflictError } from "@backend/error";
import type { TransactionRunner } from "@backend/infra/rdb/db";
import type { Tracer } from "@backend/lib/tracer";
import type { TabPreference } from "@packages/domain/user/tabPreferenceSchema";
import { createUserConsent } from "@packages/domain/user/userConsentSchema";
import {
  type User,
  type UserId,
  createUserEntity,
  createUserId,
} from "@packages/domain/user/userSchema";

import { MultiHashPasswordVerifier } from "../auth/passwordVerifier";
import type { UserProviderRepository } from "../auth/userProviderRepository";
import type { SubscriptionQueryUsecase } from "../subscription/subscriptionUsecase";
import type { UserConsentRepository } from "./userConsentRepository";
import {
  type UserDeleteUsecaseDeps,
  newDeleteUserUsecase,
} from "./userDeleteUsecase";
import { type UserListResult, newListUsersUsecase } from "./userListUsecase";
import {
  type UserWithProviders,
  enrichUser,
  getUserById,
} from "./userLookupUsecase";
import type { UserRepository } from "./userRepository";
import {
  getTabPreference,
  updateTabPreference,
} from "./userTabPreferenceUsecase";

export type ConsentsInput = {
  age: true;
  terms: string;
  privacy: string;
};

export type CreateUserInputParams = {
  loginId: string;
  password: string;
  name?: string;
  consents: ConsentsInput;
};

export type { UserWithProviders } from "./userLookupUsecase";

export type UserUsecase = {
  createUser: (params: CreateUserInputParams) => Promise<void>;
  getUserById: (userId: UserId) => Promise<UserWithProviders>;
  enrichUser: (user: User) => Promise<UserWithProviders>;
  getTabPreference: (userId: UserId) => Promise<TabPreference>;
  updateTabPreference: (
    userId: UserId,
    preference: TabPreference,
  ) => Promise<TabPreference>;
  deleteUser: (userId: UserId) => Promise<void>;
  listUsers: (limit: number, offset: number) => Promise<UserListResult>;
};

export type { UserDeleteUsecaseDeps as UserUsecaseDeps } from "./userDeleteUsecase";

export function newUserUsecase(
  repo: UserRepository,
  userProviderRepo: UserProviderRepository,
  userConsentRepo: UserConsentRepository,
  txRunner: TransactionRunner,
  subscriptionUc: SubscriptionQueryUsecase,
  tracer: Tracer,
  // deleteUser のみ refreshTokenRepo / apiKeyRepo を要求する。authRoute や admin
  // 経路は deleteUser を呼ばないので undefined で OK (未設定で deleteUser を呼ぶと throw)
  deps?: UserDeleteUsecaseDeps,
  passwordVerifier = new MultiHashPasswordVerifier(),
): UserUsecase {
  return {
    createUser: createUser(
      repo,
      userConsentRepo,
      txRunner,
      passwordVerifier,
      tracer,
    ),
    getUserById: getUserById(repo, userProviderRepo, subscriptionUc, tracer),
    enrichUser: enrichUser(repo, userProviderRepo, subscriptionUc, tracer),
    getTabPreference: getTabPreference(repo, tracer),
    updateTabPreference: updateTabPreference(repo, tracer),
    deleteUser: deps
      ? newDeleteUserUsecase(repo, deps, tracer)
      : async () => {
          throw new Error(
            "deleteUser requires deps (refreshTokenRepo, apiKeyRepo)",
          );
        },
    listUsers: newListUsersUsecase(repo, tracer),
  };
}

function createUser(
  repo: UserRepository,
  userConsentRepo: UserConsentRepository,
  txRunner: TransactionRunner,
  passwordVerifier: MultiHashPasswordVerifier,
  tracer: Tracer,
) {
  return async (params: CreateUserInputParams) => {
    const existingUser = await tracer.span("db.getUserByLoginId", () =>
      repo.getUserByLoginId(params.loginId),
    );
    if (existingUser) {
      throw new ConflictError("このログインIDは既に使用されています");
    }

    const cryptedPassword = await passwordVerifier.hash(params.password);
    const newUser = createUserEntity({
      type: "new",
      id: createUserId(),
      name: params.name,
      loginId: params.loginId,
      password: cryptedPassword,
    });

    await tracer.span("db.createUser.withConsents", () =>
      txRunner.run([repo, userConsentRepo], async (tx) => {
        const created = await tx.createUser(newUser);
        const confirmedAt = new Date();
        await tx.createUserConsents([
          createUserConsent(
            { userId: created.id, type: "age", version: null },
            confirmedAt,
          ),
          createUserConsent(
            {
              userId: created.id,
              type: "terms",
              version: params.consents.terms,
            },
            confirmedAt,
          ),
          createUserConsent(
            {
              userId: created.id,
              type: "privacy",
              version: params.consents.privacy,
            },
            confirmedAt,
          ),
        ]);
      }),
    );
  };
}

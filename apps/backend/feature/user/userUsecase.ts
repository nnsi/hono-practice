import { AppError, ConflictError } from "@backend/error";
import type { TransactionRunner } from "@backend/infra/rdb/db";
import type { Tracer } from "@backend/lib/tracer";
import type { SubscriptionPlan } from "@packages/domain/subscription/subscriptionSchema";
import {
  type TabPreference,
  createDefaultTabPreference,
} from "@packages/domain/user/tabPreferenceSchema";
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

export type UserWithProviders = User & {
  providers: string[];
  providerEmails?: Record<string, string>;
  plan: SubscriptionPlan;
  tabPreference: TabPreference;
};

type UserListResult = {
  items: {
    id: string;
    loginId: string;
    name: string | null;
    createdAt: Date;
  }[];
  total: number;
};

export type UserUsecase = {
  createUser: (params: CreateUserInputParams) => Promise<void>;
  getUserById: (userId: UserId) => Promise<UserWithProviders>;
  getTabPreference: (userId: UserId) => Promise<TabPreference>;
  updateTabPreference: (
    userId: UserId,
    preference: TabPreference,
  ) => Promise<TabPreference>;
  deleteUser: (userId: UserId) => Promise<void>;
  listUsers: (limit: number, offset: number) => Promise<UserListResult>;
};

export function newUserUsecase(
  repo: UserRepository,
  userProviderRepo: UserProviderRepository,
  userConsentRepo: UserConsentRepository,
  txRunner: TransactionRunner,
  subscriptionUc: SubscriptionQueryUsecase,
  tracer: Tracer,
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
    getTabPreference: getTabPreference(repo, tracer),
    updateTabPreference: updateTabPreference(repo, tracer),
    deleteUser: deleteUser(repo, tracer),
    listUsers: listUsers(repo, tracer),
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

function getUserById(
  repo: UserRepository,
  userProviderRepo: UserProviderRepository,
  subscriptionUc: SubscriptionQueryUsecase,
  tracer: Tracer,
) {
  return async (userId: UserId): Promise<UserWithProviders> => {
    const [user, userProviders, subscription, tabPreference] =
      await Promise.all([
        tracer.span("db.getUserById", () => repo.getUserById(userId)),
        tracer.span("db.getUserProvidersByUserId", () =>
          userProviderRepo.getUserProvidersByUserId(userId),
        ),
        subscriptionUc.getSubscriptionByUserIdOrDefault(userId),
        tracer.span("db.getTabPreference", () => repo.getTabPreference(userId)),
      ]);
    if (!user) {
      throw new AppError("user not found", 404);
    }

    const providers = userProviders.map((p) => p.provider);
    const providerEmails: Record<string, string> = {};
    for (const userProvider of userProviders) {
      if (userProvider.email) {
        providerEmails[userProvider.provider] = userProvider.email;
      }
    }

    return {
      ...user,
      providers,
      providerEmails:
        Object.keys(providerEmails).length > 0 ? providerEmails : undefined,
      plan: subscription.plan,
      tabPreference: tabPreference ?? createDefaultTabPreference(),
    };
  };
}

function deleteUser(repo: UserRepository, tracer: Tracer) {
  return async (userId: UserId): Promise<void> => {
    await tracer.span("db.deleteUser", () => repo.deleteUser(userId));
  };
}

function listUsers(repo: UserRepository, tracer: Tracer) {
  return async (limit: number, offset: number): Promise<UserListResult> => {
    return tracer.span("db.listUsers", () => repo.listUsers(limit, offset));
  };
}

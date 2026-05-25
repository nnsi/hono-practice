import { AppError } from "@backend/error";
import type { Tracer } from "@backend/lib/tracer";
import type { SubscriptionPlan } from "@packages/domain/subscription/subscriptionSchema";
import {
  type TabPreference,
  createDefaultTabPreference,
} from "@packages/domain/user/tabPreferenceSchema";
import type { User, UserId } from "@packages/domain/user/userSchema";

import type { UserProviderRepository } from "../auth/userProviderRepository";
import type { SubscriptionQueryUsecase } from "../subscription/subscriptionUsecase";
import type { UserRepository } from "./userRepository";

export type UserWithProviders = User & {
  providers: string[];
  providerEmails?: Record<string, string>;
  plan: SubscriptionPlan;
  tabPreference: TabPreference;
};

function buildUserWithProviders(
  user: User,
  userProviders: { provider: string; email?: string | null }[],
  subscription: { plan: SubscriptionPlan },
  tabPreference: TabPreference | undefined,
): UserWithProviders {
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
}

export function getUserById(
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
    return buildUserWithProviders(
      user,
      userProviders,
      subscription,
      tabPreference,
    );
  };
}

// 既に取得済みの user を受け取り、providers/subscription/tabPreference を並列取得して
// UserWithProviders を組み立てる。auth flow で重複 SELECT を避けるための入口。
export function enrichUser(
  repo: UserRepository,
  userProviderRepo: UserProviderRepository,
  subscriptionUc: SubscriptionQueryUsecase,
  tracer: Tracer,
) {
  return async (user: User): Promise<UserWithProviders> => {
    const userId = user.id;
    const [userProviders, subscription, tabPreference] = await Promise.all([
      tracer.span("db.getUserProvidersByUserId", () =>
        userProviderRepo.getUserProvidersByUserId(userId),
      ),
      subscriptionUc.getSubscriptionByUserIdOrDefault(userId),
      tracer.span("db.getTabPreference", () => repo.getTabPreference(userId)),
    ]);
    return buildUserWithProviders(
      user,
      userProviders,
      subscription,
      tabPreference,
    );
  };
}

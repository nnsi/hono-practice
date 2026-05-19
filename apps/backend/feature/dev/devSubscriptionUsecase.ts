import { AppError } from "@backend/error";
import {
  createSubscriptionId,
  newSubscription,
  type SubscriptionPlan,
} from "@packages/domain/subscription/subscriptionSchema";

import type { SubscriptionRepository } from "../subscription/subscriptionRepository";
import type { UserRepository } from "../user/userRepository";

export type DevSubscriptionUsecase = {
  setPlanByLoginId: (loginId: string, plan: SubscriptionPlan) => Promise<void>;
};

export function newDevSubscriptionUsecase(
  userRepo: UserRepository,
  subRepo: SubscriptionRepository,
  now: () => Date = () => new Date(),
): DevSubscriptionUsecase {
  return {
    async setPlanByLoginId(loginId, plan) {
      const user = await userRepo.getUserByLoginId(loginId);
      if (!user) {
        throw new AppError("user not found", 404);
      }
      const existing = await subRepo.findSubscriptionByUserId(user.id);
      const current = now();
      if (existing) {
        await subRepo.updateSubscription(
          newSubscription({
            ...existing,
            plan,
            status: plan === "premium" ? "active" : existing.status,
            updatedAt: current,
          }),
        );
        return;
      }
      await subRepo.createSubscription(
        newSubscription({
          id: createSubscriptionId(),
          userId: user.id,
          plan,
          status: "active",
          paymentProvider: null,
          paymentProviderId: null,
          currentPeriodStart: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          cancelledAt: null,
          trialStart: null,
          trialEnd: null,
          priceAmount: null,
          priceCurrency: "JPY",
          metadata: null,
          createdAt: current,
          updatedAt: current,
        }),
      );
    },
  };
}

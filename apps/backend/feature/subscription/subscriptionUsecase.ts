import { ResourceNotFoundError } from "@backend/error";
import type { Tracer } from "@backend/lib/tracer";
import {
  type Subscription,
  createSubscriptionId,
  newSubscription,
} from "@packages/domain/subscription/subscriptionSchema";
import type { UserId } from "@packages/domain/user/userSchema";

import type { SubscriptionRepository } from "./subscriptionRepository";

export type SubscriptionQueryUsecase = {
  getSubscriptionByUserId: (userId: UserId) => Promise<Subscription>;
  getSubscriptionByUserIdOrDefault: (userId: UserId) => Promise<Subscription>;
  getSubscriptionByPaymentProviderId: (
    providerId: string,
  ) => Promise<Subscription | undefined>;
  canUserAccessApiKey: (userId: UserId) => Promise<boolean>;
};

export function newSubscriptionQueryUsecase(
  subscriptionRepo: SubscriptionRepository,
  tracer: Tracer,
): SubscriptionQueryUsecase {
  return {
    getSubscriptionByUserId: getSubscriptionByUserId(subscriptionRepo, tracer),
    getSubscriptionByUserIdOrDefault: getSubscriptionByUserIdOrDefault(
      subscriptionRepo,
      tracer,
    ),
    getSubscriptionByPaymentProviderId: (providerId: string) =>
      tracer.span("db.findSubscriptionByPaymentProviderId", () =>
        subscriptionRepo.findSubscriptionByPaymentProviderId(providerId),
      ),
    canUserAccessApiKey: canUserAccessApiKey(subscriptionRepo, tracer),
  };
}

function getSubscriptionByUserId(
  subscriptionRepo: SubscriptionRepository,
  tracer: Tracer,
) {
  return async (userId: UserId): Promise<Subscription> => {
    const subscription = await tracer.span("db.findSubscriptionByUserId", () =>
      subscriptionRepo.findSubscriptionByUserId(userId),
    );
    if (!subscription) {
      throw new ResourceNotFoundError("Subscription not found");
    }
    return subscription;
  };
}

function getSubscriptionByUserIdOrDefault(
  subscriptionRepo: SubscriptionRepository,
  tracer: Tracer,
) {
  return async (userId: UserId): Promise<Subscription> => {
    const subscription = await tracer.span("db.findSubscriptionByUserId", () =>
      subscriptionRepo.findSubscriptionByUserId(userId),
    );
    if (!subscription) {
      return newSubscription({
        id: createSubscriptionId(),
        userId,
        plan: "free",
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
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    return subscription;
  };
}

function canUserAccessApiKey(
  subscriptionRepo: SubscriptionRepository,
  tracer: Tracer,
) {
  return async (userId: UserId): Promise<boolean> => {
    const subscription = await tracer.span("db.findSubscriptionByUserId", () =>
      subscriptionRepo.findSubscriptionByUserId(userId),
    );
    if (!subscription) {
      return false;
    }
    return subscription.canUseApiKey();
  };
}

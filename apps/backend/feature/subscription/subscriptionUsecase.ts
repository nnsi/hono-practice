import { createSubscriptionId, newSubscription } from "@backend/domain";
import { ResourceNotFoundError } from "@backend/error";

import type { SubscriptionRepository } from "./subscriptionRepository";
import type { Subscription, UserId } from "@backend/domain";

export type SubscriptionUsecase = {
  getSubscriptionByUserId: (userId: UserId) => Promise<Subscription>;
  getSubscriptionByUserIdOrDefault: (userId: UserId) => Promise<Subscription>;
  canUserAccessApiKey: (userId: UserId) => Promise<boolean>;
};

export function newSubscriptionUsecase(
  subscriptionRepo: SubscriptionRepository,
): SubscriptionUsecase {
  return {
    getSubscriptionByUserId: getSubscriptionByUserId(subscriptionRepo),
    getSubscriptionByUserIdOrDefault:
      getSubscriptionByUserIdOrDefault(subscriptionRepo),
    canUserAccessApiKey: canUserAccessApiKey(subscriptionRepo),
  };
}

function getSubscriptionByUserId(subscriptionRepo: SubscriptionRepository) {
  return async (userId: UserId): Promise<Subscription> => {
    const subscription = await subscriptionRepo.findByUserId(userId);

    if (!subscription) {
      throw new ResourceNotFoundError("Subscription not found");
    }

    return subscription;
  };
}

function getSubscriptionByUserIdOrDefault(
  subscriptionRepo: SubscriptionRepository,
) {
  return async (userId: UserId): Promise<Subscription> => {
    const subscription = await subscriptionRepo.findByUserId(userId);

    if (!subscription) {
      return createDefaultSubscription(userId);
    }

    return subscription;
  };
}

function canUserAccessApiKey(subscriptionRepo: SubscriptionRepository) {
  return async (userId: UserId): Promise<boolean> => {
    const subscription = await subscriptionRepo.findByUserId(userId);

    if (!subscription) {
      return false;
    }

    return subscription.canUseApiKey();
  };
}

function createDefaultSubscription(userId: UserId): Subscription {
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
    priceCurrency: "USD",
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

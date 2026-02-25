import {
  type Subscription,
  createSubscriptionId,
  newSubscription,
} from "@packages/domain/subscription/subscriptionSchema";
import type { UserId } from "@packages/domain/user/userSchema";
import { ResourceNotFoundError } from "@backend/error";
import type { Tracer } from "@backend/lib/tracer";

import type { SubscriptionRepository } from "./subscriptionRepository";

export type SubscriptionUsecase = {
  getSubscriptionByUserId: (userId: UserId) => Promise<Subscription>;
  getSubscriptionByUserIdOrDefault: (userId: UserId) => Promise<Subscription>;
  canUserAccessApiKey: (userId: UserId) => Promise<boolean>;
};

export function newSubscriptionUsecase(
  subscriptionRepo: SubscriptionRepository,
  tracer: Tracer,
): SubscriptionUsecase {
  return {
    getSubscriptionByUserId: getSubscriptionByUserId(subscriptionRepo, tracer),
    getSubscriptionByUserIdOrDefault: getSubscriptionByUserIdOrDefault(
      subscriptionRepo,
      tracer,
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
      subscriptionRepo.findByUserId(userId),
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
      subscriptionRepo.findByUserId(userId),
    );

    if (!subscription) {
      return createDefaultSubscription(userId);
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
      subscriptionRepo.findByUserId(userId),
    );

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

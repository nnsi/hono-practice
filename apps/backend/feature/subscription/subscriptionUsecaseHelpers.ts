import {
  type Subscription,
  createSubscriptionId,
  newSubscription,
} from "@packages/domain/subscription/subscriptionSchema";
import type { UserId } from "@packages/domain/user/userSchema";

export function createDefaultSubscription(userId: UserId): Subscription {
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

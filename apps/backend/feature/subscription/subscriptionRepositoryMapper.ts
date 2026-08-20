import type { userSubscriptions } from "@infra/drizzle/schema";
import {
  type Subscription,
  createSubscriptionId,
  newSubscription,
} from "@packages/domain/subscription/subscriptionSchema";
import { createUserId } from "@packages/domain/user/userSchema";

export function subscriptionToPersistenceValues(subscription: Subscription) {
  return {
    id: subscription.id,
    userId: subscription.userId,
    plan: subscription.plan,
    status: subscription.status,
    paymentProvider: subscription.paymentProvider,
    paymentProviderId: subscription.paymentProviderId,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    cancelledAt: subscription.cancelledAt,
    trialStart: subscription.trialStart,
    trialEnd: subscription.trialEnd,
    priceAmount: subscription.priceAmount,
    priceCurrency: subscription.priceCurrency,
    metadata: subscription.metadata
      ? JSON.stringify(subscription.metadata)
      : null,
    lastEventOccurredAt: subscription.lastEventOccurredAt,
    lastEventSequence: subscription.lastEventSequence,
    updatedAt: subscription.updatedAt,
  };
}

export function mapToSubscription(
  row: typeof userSubscriptions.$inferSelect,
): Subscription {
  return newSubscription({
    id: createSubscriptionId(row.id),
    userId: createUserId(row.userId),
    plan: row.plan,
    status: row.status,
    paymentProvider: row.paymentProvider,
    paymentProviderId: row.paymentProviderId,
    currentPeriodStart: row.currentPeriodStart,
    currentPeriodEnd: row.currentPeriodEnd,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    cancelledAt: row.cancelledAt,
    trialStart: row.trialStart,
    trialEnd: row.trialEnd,
    priceAmount: row.priceAmount,
    priceCurrency: row.priceCurrency ?? "JPY",
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
    lastEventOccurredAt: row.lastEventOccurredAt,
    lastEventSequence: row.lastEventSequence,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

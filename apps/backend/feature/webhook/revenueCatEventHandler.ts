import type { Logger } from "@backend/lib/logger";

import type { SubscriptionCommandUsecase } from "../subscription/subscriptionCommandUsecase";

type RevenueCatEvent = {
  type: string;
  app_user_id: string;
  id: string;
  original_transaction_id?: string;
  expiration_at_ms?: number;
};

export async function handleRevenueCatEvent(
  event: RevenueCatEvent,
  commandUc: SubscriptionCommandUsecase,
  logger: Logger,
): Promise<void> {
  const userId = event.app_user_id;
  const providerId = event.original_transaction_id ?? event.id;
  const expirationDate = event.expiration_at_ms
    ? new Date(event.expiration_at_ms)
    : undefined;

  switch (event.type) {
    case "INITIAL_PURCHASE":
    case "RENEWAL": {
      await commandUc.upsertSubscriptionFromPayment({
        userId,
        plan: "premium",
        status: "active",
        paymentProvider: "revenuecat",
        paymentProviderId: providerId,
        currentPeriodEnd: expirationDate,
        eventType: event.type,
        webhookId: event.id,
      });
      break;
    }

    // CANCELLATION = 期間終了時にキャンセル予定。現在の期間中はまだ有効なので plan: "premium" を維持
    case "CANCELLATION": {
      await commandUc.upsertSubscriptionFromPayment({
        userId,
        plan: "premium",
        status: "active",
        paymentProvider: "revenuecat",
        paymentProviderId: providerId,
        cancelAtPeriodEnd: true,
        eventType: event.type,
        webhookId: event.id,
      });
      break;
    }

    case "EXPIRATION": {
      await commandUc.upsertSubscriptionFromPayment({
        userId,
        plan: "free",
        status: "expired",
        paymentProvider: "revenuecat",
        paymentProviderId: providerId,
        eventType: event.type,
        webhookId: event.id,
      });
      break;
    }

    // BILLING_ISSUE: payment failed, entitlement is suspended
    case "BILLING_ISSUE": {
      await commandUc.upsertSubscriptionFromPayment({
        userId,
        plan: "free",
        status: "paused",
        paymentProvider: "revenuecat",
        paymentProviderId: providerId,
        eventType: event.type,
        webhookId: event.id,
      });
      break;
    }

    // UNCANCELLATION: user re-subscribed before period end, cancel is reversed
    case "UNCANCELLATION": {
      await commandUc.upsertSubscriptionFromPayment({
        userId,
        plan: "premium",
        status: "active",
        paymentProvider: "revenuecat",
        paymentProviderId: providerId,
        cancelAtPeriodEnd: false,
        eventType: event.type,
        webhookId: event.id,
      });
      break;
    }

    default: {
      logger.warn("unhandled_revenuecat_event", {
        eventType: event.type,
        webhookId: event.id,
      });
      break;
    }
  }
}

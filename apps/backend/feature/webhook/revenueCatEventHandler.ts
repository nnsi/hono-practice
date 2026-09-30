import type { Logger } from "@backend/lib/logger";

import type { SubscriptionCommandUsecase } from "../subscription/subscriptionCommandUsecase";

type RevenueCatEvent = {
  type: string;
  app_user_id: string;
  id: string;
  original_transaction_id?: string;
  expiration_at_ms?: number | null;
  grace_period_expiration_at_ms?: number | null;
  entitlement_ids?: string[] | null;
  cancel_reason?: string | null;
  event_timestamp_ms: number;
};

export async function handleRevenueCatEvent(
  event: RevenueCatEvent,
  commandUc: SubscriptionCommandUsecase,
  logger: Logger,
): Promise<void> {
  // Only the entitlement used by both clients can grant or revoke this plan.
  if (!event.entitlement_ids?.includes("premium")) {
    logger.warn("revenuecat_entitlement_skipped", { webhookId: event.id });
    return;
  }
  const userId = event.app_user_id;
  const providerId = event.original_transaction_id ?? event.id;
  const periodEnd = Math.max(
    event.expiration_at_ms ?? Number.NEGATIVE_INFINITY,
    event.grace_period_expiration_at_ms ?? Number.NEGATIVE_INFINITY,
  );
  const expirationDate = Number.isFinite(periodEnd)
    ? new Date(periodEnd)
    : undefined;
  const ordering = {
    eventOccurredAt: new Date(event.event_timestamp_ms),
    eventSequence: event.id,
  };

  // BILLING_ISSUE carries the grace deadline. Its companion cancellation
  // must not shorten that deadline when deliveries arrive in either order.
  if (
    event.type === "CANCELLATION" &&
    event.cancel_reason === "BILLING_ERROR"
  ) {
    return;
  }

  switch (event.type) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "SUBSCRIPTION_EXTENDED":
    case "REFUND_REVERSED": {
      await commandUc.upsertSubscriptionFromPayment({
        userId,
        plan: "premium",
        status: "active",
        paymentProvider: "revenuecat",
        paymentProviderId: providerId,
        cancelAtPeriodEnd:
          event.type === "INITIAL_PURCHASE" || event.type === "RENEWAL"
            ? false
            : undefined,
        currentPeriodEnd: expirationDate,
        eventType: event.type,
        webhookId: event.id,
        ...ordering,
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
        // A refund does not necessarily disable renewal in the store.
        cancelAtPeriodEnd:
          event.cancel_reason === "CUSTOMER_SUPPORT" ? undefined : true,
        currentPeriodEnd: expirationDate,
        eventType: event.type,
        webhookId: event.id,
        ...ordering,
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
        ...ordering,
      });
      break;
    }

    // A failed charge does not revoke the paid period or billing grace period.
    case "BILLING_ISSUE": {
      await commandUc.upsertSubscriptionFromPayment({
        userId,
        plan: "premium",
        status: "active",
        currentPeriodEnd: expirationDate,
        paymentProvider: "revenuecat",
        paymentProviderId: providerId,
        eventType: event.type,
        webhookId: event.id,
        ...ordering,
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
        currentPeriodEnd: expirationDate,
        eventType: event.type,
        webhookId: event.id,
        ...ordering,
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

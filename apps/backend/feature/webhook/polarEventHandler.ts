import type { SubscriptionCommandUsecase } from "../subscription/subscriptionCommandUsecase";
import type { SubscriptionQueryUsecase } from "../subscription/subscriptionUsecase";
import { POLAR_STATUS_MAP, resolvePlan } from "./polarSubscriptionMapping";
import type {
  PolarSubscription,
  PolarSubscriptionEvent,
} from "./polarWebhookSchema";

type PolarEvent = {
  type: PolarSubscriptionEvent;
  data: PolarSubscription;
  webhookId: string;
};

async function resolveUserId(
  subscription: PolarSubscription,
  queryUc: SubscriptionQueryUsecase,
): Promise<string | undefined> {
  if (subscription.metadata.userId) return subscription.metadata.userId;
  const existing = await queryUc.getSubscriptionByPaymentProviderId(
    "polar",
    subscription.id,
  );
  return existing?.userId;
}

export async function handlePolarSubscriptionEvent(
  event: PolarEvent,
  queryUc: SubscriptionQueryUsecase,
  commandUc: SubscriptionCommandUsecase,
): Promise<void> {
  const subscription = event.data;
  const userId = await resolveUserId(subscription, queryUc);
  if (!userId) return;

  const period = {
    currentPeriodStart: new Date(subscription.current_period_start),
    currentPeriodEnd: new Date(subscription.current_period_end),
    trialStart: subscription.trial_start
      ? new Date(subscription.trial_start)
      : undefined,
    trialEnd: subscription.trial_end
      ? new Date(subscription.trial_end)
      : undefined,
  };
  const ordering = {
    eventOccurredAt: new Date(subscription.modified_at),
    eventSequence: event.webhookId,
  };
  const base = {
    userId,
    paymentProvider: "polar",
    paymentProviderId: subscription.id,
    eventType: event.type,
    webhookId: event.webhookId,
    ...period,
    ...ordering,
  };

  if (event.type === "subscription.revoked") {
    await commandUc.upsertSubscriptionFromPayment({
      ...base,
      plan: "free",
      status: "cancelled",
    });
    return;
  }

  if (event.type === "subscription.canceled") {
    await commandUc.upsertSubscriptionFromPayment({
      ...base,
      plan: "premium",
      status: "active",
      cancelAtPeriodEnd: true,
    });
    return;
  }

  const status = POLAR_STATUS_MAP[subscription.status] ?? "expired";
  await commandUc.upsertSubscriptionFromPayment({
    ...base,
    plan: resolvePlan(status),
    status,
    ...(event.type === "subscription.updated" ||
    event.type === "subscription.active"
      ? { cancelAtPeriodEnd: subscription.cancel_at_period_end }
      : {}),
  });
}

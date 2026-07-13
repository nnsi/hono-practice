import type { Subscription } from "@packages/domain/subscription/subscriptionSchema";

function entitlementEnd(subscription: Subscription): number {
  const end =
    subscription.status === "trial"
      ? subscription.trialEnd
      : subscription.currentPeriodEnd;
  return end?.getTime() ?? 0;
}

function eventOrder(subscription: Subscription): number {
  return (
    subscription.lastEventOccurredAt?.getTime() ??
    subscription.updatedAt.getTime()
  );
}

export function selectEffectiveSubscription(
  subscriptions: Subscription[],
): Subscription | undefined {
  return subscriptions.toSorted((left, right) => {
    const planOrder =
      Number(right.getEffectivePlan() === "premium") -
      Number(left.getEffectivePlan() === "premium");
    if (planOrder !== 0) return planOrder;

    const endOrder = entitlementEnd(right) - entitlementEnd(left);
    if (endOrder !== 0) return endOrder;

    const eventOrderDifference = eventOrder(right) - eventOrder(left);
    if (eventOrderDifference !== 0) return eventOrderDifference;

    return right.id.localeCompare(left.id);
  })[0];
}

import type { SubscriptionPlan } from "./subscriptionSchema";

export const canUseApiKey = (plan: SubscriptionPlan): boolean =>
  plan === "premium";

/** @public */
export const canUseVoiceRecord = (plan: SubscriptionPlan): boolean =>
  plan === "premium";

/** @public */
export const canUseWatch = (plan: SubscriptionPlan): boolean =>
  plan === "premium";

/** @public */
export const maxWidgetCount = (plan: SubscriptionPlan): number =>
  plan === "free" ? 1 : Number.POSITIVE_INFINITY;

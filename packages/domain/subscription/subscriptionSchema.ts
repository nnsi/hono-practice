import { v7 } from "uuid";
import { z } from "zod";

import { DomainValidateError } from "../errors";
import { canUseApiKey as canUseApiKeyEntitlement } from "./entitlement";

export const subscriptionIdSchema = z.string().uuid().brand<"SubscriptionId">();

export type SubscriptionId = z.infer<typeof subscriptionIdSchema>;

export function createSubscriptionId(id?: string): SubscriptionId {
  const subscriptionId = id ?? v7();

  const parsedId = subscriptionIdSchema.safeParse(subscriptionId);
  if (!parsedId.success) {
    throw new DomainValidateError("createSubscriptionId: Invalid id");
  }

  return parsedId.data;
}

export type SubscriptionPlan = "free" | "premium";
export const subscriptionStatusSchema = z.enum([
  "trial",
  "active",
  "paused",
  "cancelled",
  "expired",
]);
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;
export const SUBSCRIPTION_STATUSES: readonly SubscriptionStatus[] =
  subscriptionStatusSchema.options;

/**
 * Payment providers may recover a subscription after a billing failure or
 * expiry, but an active entitlement must never jump back into a trial.
 * Keeping the graph here makes webhook policy explicit and shared.
 */
export const ALLOWED_SUBSCRIPTION_TRANSITIONS: Readonly<
  Record<SubscriptionStatus, ReadonlySet<SubscriptionStatus>>
> = {
  trial: new Set(["trial", "active", "paused", "cancelled", "expired"]),
  active: new Set(["active", "paused", "cancelled", "expired"]),
  paused: new Set(["active", "paused", "cancelled", "expired"]),
  cancelled: new Set(["active", "cancelled", "expired"]),
  expired: new Set(["trial", "active", "expired"]),
};

export function isAllowedSubscriptionTransition(
  from: SubscriptionStatus,
  to: SubscriptionStatus,
): boolean {
  return ALLOWED_SUBSCRIPTION_TRANSITIONS[from].has(to);
}

type SubscriptionData = {
  id: SubscriptionId;
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  paymentProvider: string | null;
  paymentProviderId: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  cancelledAt: Date | null;
  trialStart: Date | null;
  trialEnd: Date | null;
  priceAmount: number | null;
  priceCurrency: string;
  metadata: Record<string, unknown> | null;
  lastEventOccurredAt: Date | null;
  lastEventSequence: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Subscription = SubscriptionData & {
  isActive: () => boolean;
  isPremium: () => boolean;
  isInTrial: () => boolean;
  getEffectivePlan: () => SubscriptionPlan;
  canUseApiKey: () => boolean;
};

// 純粋関数版
export function isSubscriptionActive(
  sub: Pick<SubscriptionData, "status"> &
    Partial<Pick<SubscriptionData, "currentPeriodEnd" | "trialEnd">>,
  now: Date = new Date(),
): boolean {
  if (sub.status === "active") {
    return sub.currentPeriodEnd != null && now < sub.currentPeriodEnd;
  }
  if (sub.status === "trial" && sub.trialEnd) return now < sub.trialEnd;
  return false;
}

export function isSubscriptionPremium(
  sub: Pick<SubscriptionData, "plan" | "status"> &
    Partial<Pick<SubscriptionData, "currentPeriodEnd" | "trialEnd">>,
  now: Date = new Date(),
): boolean {
  return getEffectiveSubscriptionPlan(sub, now) === "premium";
}

export function getEffectiveSubscriptionPlan(
  sub: Pick<SubscriptionData, "plan" | "status"> &
    Partial<Pick<SubscriptionData, "currentPeriodEnd" | "trialEnd">>,
  now: Date = new Date(),
): SubscriptionPlan {
  return sub.plan === "premium" && isSubscriptionActive(sub, now)
    ? "premium"
    : "free";
}

export function isSubscriptionInTrial(
  sub: Pick<SubscriptionData, "status" | "trialEnd">,
  now: Date = new Date(),
): boolean {
  return sub.status === "trial" && sub.trialEnd !== null && now < sub.trialEnd;
}

type SubscriptionInput = Omit<
  SubscriptionData,
  "lastEventOccurredAt" | "lastEventSequence"
> &
  Partial<Pick<SubscriptionData, "lastEventOccurredAt" | "lastEventSequence">>;

export const newSubscription = (params: SubscriptionInput): Subscription => {
  const isActive = (): boolean => isSubscriptionActive(params);
  const isPremium = (): boolean => isSubscriptionPremium(params);
  const isInTrial = (): boolean => isSubscriptionInTrial(params);
  const getEffectivePlan = (): SubscriptionPlan =>
    getEffectiveSubscriptionPlan(params);
  const canUseApiKey = (): boolean =>
    canUseApiKeyEntitlement(getEffectivePlan());

  return {
    ...params,
    lastEventOccurredAt: params.lastEventOccurredAt ?? null,
    lastEventSequence: params.lastEventSequence ?? null,
    isActive,
    isPremium,
    isInTrial,
    getEffectivePlan,
    canUseApiKey,
  };
};

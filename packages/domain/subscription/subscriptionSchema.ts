import { DomainValidateError } from "../errors";
import { v7 } from "uuid";
import { z } from "zod";

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

export type SubscriptionPlan = "free" | "premium" | "enterprise";
export type SubscriptionStatus =
  | "trial"
  | "active"
  | "paused"
  | "cancelled"
  | "expired";

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
  createdAt: Date;
  updatedAt: Date;
};

export type Subscription = SubscriptionData & {
  isActive: () => boolean;
  isPremium: () => boolean;
  isInTrial: () => boolean;
  canUseApiKey: () => boolean;
};

// 純粋関数版
export function isSubscriptionActive(
  sub: Pick<SubscriptionData, "status" | "trialEnd">,
  now: Date = new Date(),
): boolean {
  if (sub.status === "active") return true;
  if (sub.status === "trial" && sub.trialEnd) return now < sub.trialEnd;
  return false;
}

export function isSubscriptionPremium(
  sub: Pick<SubscriptionData, "plan">,
): boolean {
  return sub.plan === "premium" || sub.plan === "enterprise";
}

export function isSubscriptionInTrial(
  sub: Pick<SubscriptionData, "status" | "trialEnd">,
  now: Date = new Date(),
): boolean {
  return sub.status === "trial" && sub.trialEnd !== null && now < sub.trialEnd;
}

export const newSubscription = (params: SubscriptionData): Subscription => {
  const isActive = (): boolean => isSubscriptionActive(params);
  const isPremium = (): boolean => isSubscriptionPremium(params);
  const isInTrial = (): boolean => isSubscriptionInTrial(params);
  const canUseApiKey = (): boolean => isActive() && isPremium();

  return {
    ...params,
    isActive,
    isPremium,
    isInTrial,
    canUseApiKey,
  };
};

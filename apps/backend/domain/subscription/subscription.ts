import type { SubscriptionId } from "./subscriptionId";
import type { UserId } from "../user/userId";

export type SubscriptionPlan = "free" | "premium" | "enterprise";
export type SubscriptionStatus =
  | "trial"
  | "active"
  | "paused"
  | "cancelled"
  | "expired";

export type Subscription = {
  id: SubscriptionId;
  userId: UserId;
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
  isActive: () => boolean;
  isPremium: () => boolean;
  isInTrial: () => boolean;
  canUseApiKey: () => boolean;
};

export const newSubscription = (params: {
  id: SubscriptionId;
  userId: UserId;
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
}): Subscription => {
  const isActive = (): boolean => {
    if (params.status === "active") {
      return true;
    }
    if (params.status === "trial" && params.trialEnd) {
      return new Date() < params.trialEnd;
    }
    return false;
  };

  const isPremium = (): boolean => {
    return params.plan === "premium" || params.plan === "enterprise";
  };

  const isInTrial = (): boolean => {
    return (
      params.status === "trial" &&
      params.trialEnd !== null &&
      new Date() < params.trialEnd
    );
  };

  const canUseApiKey = (): boolean => {
    return isActive() && isPremium();
  };

  return {
    ...params,
    isActive,
    isPremium,
    isInTrial,
    canUseApiKey,
  };
};

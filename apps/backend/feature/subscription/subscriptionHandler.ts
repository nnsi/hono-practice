import { AppError } from "@backend/error";
import type { UserId } from "@packages/domain/user/userSchema";
import { SubscriptionResponseSchema } from "@packages/types/response";

import type { SubscriptionQueryUsecase } from "./subscriptionUsecase";

export type SubscriptionHandler = {
  getSubscription: (userId: UserId) => Promise<{
    plan: string;
    status: string;
    canUseApiKey: boolean;
    trialEnd: string | null;
    currentPeriodEnd: string | null;
  }>;
};

export function newSubscriptionHandler(
  subscriptionUsecase: SubscriptionQueryUsecase,
): SubscriptionHandler {
  return {
    getSubscription: getSubscription(subscriptionUsecase),
  };
}

function getSubscription(subscriptionUsecase: SubscriptionQueryUsecase) {
  return async (userId: UserId) => {
    const subscription =
      await subscriptionUsecase.getSubscriptionByUserIdOrDefault(userId);

    const response = {
      plan: subscription.plan,
      status: subscription.status,
      canUseApiKey: subscription.canUseApiKey(),
      trialEnd: subscription.trialEnd?.toISOString() || null,
      currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() || null,
    };

    const parsedResponse = SubscriptionResponseSchema.safeParse(response);
    if (!parsedResponse.success) {
      throw new AppError("failed to parse subscription response", 500);
    }

    return parsedResponse.data;
  };
}

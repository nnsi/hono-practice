import { ResourceNotFoundError } from "@backend/error";
import type { TransactionRunner } from "@backend/infra/rdb/db";
import type { Tracer } from "@backend/lib/tracer";
import type {
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@packages/domain/subscription/subscriptionSchema";
import type { UserId } from "@packages/domain/user/userSchema";

import type { SubscriptionHistoryRepository } from "./subscriptionHistoryRepository";
import type { SubscriptionRepository } from "./subscriptionRepository";
import {
  createDefaultSubscription,
  upsertSubscriptionFromPayment,
} from "./subscriptionUsecaseHelpers";

export type UpsertSubscriptionFromPaymentParams = {
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  paymentProvider: string;
  paymentProviderId: string;
  eventType: string;
  webhookId?: string | null;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  priceAmount?: number;
  priceCurrency?: string;
};

export type SubscriptionUsecase = {
  getSubscriptionByUserId: (userId: UserId) => Promise<Subscription>;
  getSubscriptionByUserIdOrDefault: (userId: UserId) => Promise<Subscription>;
  getSubscriptionByPaymentProviderId: (
    providerId: string,
  ) => Promise<Subscription | undefined>;
  canUserAccessApiKey: (userId: UserId) => Promise<boolean>;
  upsertSubscriptionFromPayment: (
    params: UpsertSubscriptionFromPaymentParams,
  ) => Promise<void>;
};

export function newSubscriptionUsecase(
  txRunner: TransactionRunner,
  subscriptionRepo: SubscriptionRepository,
  historyRepo: SubscriptionHistoryRepository,
  tracer: Tracer,
): SubscriptionUsecase {
  return {
    getSubscriptionByUserId: getSubscriptionByUserId(subscriptionRepo, tracer),
    getSubscriptionByUserIdOrDefault: getSubscriptionByUserIdOrDefault(
      subscriptionRepo,
      tracer,
    ),
    getSubscriptionByPaymentProviderId: (providerId: string) =>
      tracer.span("db.findSubscriptionByPaymentProviderId", () =>
        subscriptionRepo.findByPaymentProviderId(providerId),
      ),
    canUserAccessApiKey: canUserAccessApiKey(subscriptionRepo, tracer),
    upsertSubscriptionFromPayment: upsertSubscriptionFromPayment(
      txRunner,
      subscriptionRepo,
      historyRepo,
      tracer,
    ),
  };
}

function getSubscriptionByUserId(
  subscriptionRepo: SubscriptionRepository,
  tracer: Tracer,
) {
  return async (userId: UserId): Promise<Subscription> => {
    const subscription = await tracer.span("db.findSubscriptionByUserId", () =>
      subscriptionRepo.findByUserId(userId),
    );
    if (!subscription) {
      throw new ResourceNotFoundError("Subscription not found");
    }
    return subscription;
  };
}

function getSubscriptionByUserIdOrDefault(
  subscriptionRepo: SubscriptionRepository,
  tracer: Tracer,
) {
  return async (userId: UserId): Promise<Subscription> => {
    const subscription = await tracer.span("db.findSubscriptionByUserId", () =>
      subscriptionRepo.findByUserId(userId),
    );
    if (!subscription) {
      return createDefaultSubscription(userId);
    }
    return subscription;
  };
}

function canUserAccessApiKey(
  subscriptionRepo: SubscriptionRepository,
  tracer: Tracer,
) {
  return async (userId: UserId): Promise<boolean> => {
    const subscription = await tracer.span("db.findSubscriptionByUserId", () =>
      subscriptionRepo.findByUserId(userId),
    );
    if (!subscription) {
      return false;
    }
    return subscription.canUseApiKey();
  };
}

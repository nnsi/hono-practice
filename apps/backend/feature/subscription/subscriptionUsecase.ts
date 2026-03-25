import { ResourceNotFoundError } from "@backend/error";
import type { Tracer } from "@backend/lib/tracer";
import {
  type Subscription,
  type SubscriptionPlan,
  type SubscriptionStatus,
  createSubscriptionId,
  newSubscription,
} from "@packages/domain/subscription/subscriptionSchema";
import { type UserId, createUserId } from "@packages/domain/user/userSchema";

import type { SubscriptionRepository } from "./subscriptionRepository";

export type UpsertSubscriptionFromPaymentParams = {
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  paymentProvider: string;
  paymentProviderId: string;
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
  subscriptionRepo: SubscriptionRepository,
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
      subscriptionRepo,
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

function upsertSubscriptionFromPayment(
  subscriptionRepo: SubscriptionRepository,
  tracer: Tracer,
) {
  return async (params: UpsertSubscriptionFromPaymentParams): Promise<void> => {
    const userId = createUserId(params.userId);
    const existing = await tracer.span("db.findSubscriptionByUserId", () =>
      subscriptionRepo.findByUserId(userId),
    );

    const now = new Date();

    if (existing) {
      const updated = newSubscription({
        ...existing,
        plan: params.plan,
        status: params.status,
        paymentProvider: params.paymentProvider,
        paymentProviderId: params.paymentProviderId,
        currentPeriodStart:
          params.currentPeriodStart ?? existing.currentPeriodStart,
        currentPeriodEnd: params.currentPeriodEnd ?? existing.currentPeriodEnd,
        cancelAtPeriodEnd:
          params.cancelAtPeriodEnd ?? existing.cancelAtPeriodEnd,
        priceAmount: params.priceAmount ?? existing.priceAmount,
        priceCurrency: params.priceCurrency ?? existing.priceCurrency,
        updatedAt: now,
      });
      await tracer.span("db.updateSubscription", () =>
        subscriptionRepo.update(updated),
      );
    } else {
      const sub = newSubscription({
        id: createSubscriptionId(),
        userId,
        plan: params.plan,
        status: params.status,
        paymentProvider: params.paymentProvider,
        paymentProviderId: params.paymentProviderId,
        currentPeriodStart: params.currentPeriodStart ?? null,
        currentPeriodEnd: params.currentPeriodEnd ?? null,
        cancelAtPeriodEnd: params.cancelAtPeriodEnd ?? false,
        cancelledAt: null,
        trialStart: null,
        trialEnd: null,
        priceAmount: params.priceAmount ?? null,
        priceCurrency: params.priceCurrency ?? "JPY",
        metadata: null,
        createdAt: now,
        updatedAt: now,
      });
      await tracer.span("db.createSubscription", () =>
        subscriptionRepo.create(sub),
      );
    }
  };
}

function createDefaultSubscription(userId: UserId): Subscription {
  return newSubscription({
    id: createSubscriptionId(),
    userId,
    plan: "free",
    status: "active",
    paymentProvider: null,
    paymentProviderId: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    cancelledAt: null,
    trialStart: null,
    trialEnd: null,
    priceAmount: null,
    priceCurrency: "JPY",
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

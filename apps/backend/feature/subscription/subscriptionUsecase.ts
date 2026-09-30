import { ResourceNotFoundError } from "@backend/error";
import type { Tracer } from "@backend/lib/tracer";
import {
  type Subscription,
  createSubscriptionId,
  newSubscription,
} from "@packages/domain/subscription/subscriptionSchema";
import type { UserId } from "@packages/domain/user/userSchema";

import type { SubscriptionRenewalQueryService } from "./revenueCatSubscriptionQueryService";
import type { SubscriptionRepository } from "./subscriptionRepository";

export type SubscriptionQueryUsecase = {
  getSubscriptionByUserId: (userId: UserId) => Promise<Subscription>;
  getSubscriptionByUserIdOrDefault: (userId: UserId) => Promise<Subscription>;
  getSubscriptionByPaymentProviderId: (
    paymentProvider: string,
    providerId: string,
  ) => Promise<Subscription | undefined>;
  canUserAccessApiKey: (userId: UserId) => Promise<boolean>;
};

export function newSubscriptionQueryUsecase(
  subscriptionRepo: SubscriptionRepository,
  tracer: Tracer,
  renewalQuery?: SubscriptionRenewalQueryService,
): SubscriptionQueryUsecase {
  const resolvedRepo = {
    ...subscriptionRepo,
    findSubscriptionByUserId: async (userId: UserId) => {
      const stored = await subscriptionRepo.findSubscriptionByUserId(userId);
      const end = stored?.currentPeriodEnd?.getTime();
      if (
        !renewalQuery ||
        !stored ||
        stored.paymentProvider !== "revenuecat" ||
        stored.plan !== "premium" ||
        stored.status !== "active" ||
        stored.cancelAtPeriodEnd ||
        end == null ||
        end > Date.now() ||
        (stored.lastEventOccurredAt != null &&
          end <= stored.lastEventOccurredAt.getTime()) ||
        Date.now() - end > 5 * 60_000
      )
        return stored;
      const renewedEnd = await tracer.span("ext.revenuecatRenewal", () =>
        renewalQuery.getRevenueCatPeriodEnd(
          userId,
          `${stored.id}:${stored.lastEventSequence}:${end}`,
        ),
      );
      if (!renewedEnd || renewedEnd.getTime() <= Date.now()) return stored;
      // A cancellation/refund or newer webhook during the lookup wins. Never
      // persist this snapshot or advance webhook ordering with a synthetic event.
      const latest = await subscriptionRepo.findSubscriptionByUserId(userId);
      if (
        !latest ||
        latest.id !== stored.id ||
        latest.updatedAt.getTime() !== stored.updatedAt.getTime() ||
        latest.lastEventSequence !== stored.lastEventSequence ||
        latest.currentPeriodEnd?.getTime() !== end ||
        latest.plan !== stored.plan ||
        latest.status !== stored.status ||
        latest.cancelAtPeriodEnd
      )
        return latest;
      return newSubscription({ ...latest, currentPeriodEnd: renewedEnd });
    },
  };
  return {
    getSubscriptionByUserId: getSubscriptionByUserId(resolvedRepo, tracer),
    getSubscriptionByUserIdOrDefault: getSubscriptionByUserIdOrDefault(
      resolvedRepo,
      tracer,
    ),
    getSubscriptionByPaymentProviderId: (
      paymentProvider: string,
      providerId: string,
    ) =>
      tracer.span("db.findSubscriptionByPaymentProviderId", () =>
        subscriptionRepo.findSubscriptionByPaymentProviderId(
          paymentProvider,
          providerId,
        ),
      ),
    canUserAccessApiKey: canUserAccessApiKey(resolvedRepo, tracer),
  };
}

function getSubscriptionByUserId(
  subscriptionRepo: SubscriptionRepository,
  tracer: Tracer,
) {
  return async (userId: UserId): Promise<Subscription> => {
    const subscription = await tracer.span("db.findSubscriptionByUserId", () =>
      subscriptionRepo.findSubscriptionByUserId(userId),
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
      subscriptionRepo.findSubscriptionByUserId(userId),
    );
    if (!subscription) {
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
    return subscription;
  };
}

function canUserAccessApiKey(
  subscriptionRepo: SubscriptionRepository,
  tracer: Tracer,
) {
  return async (userId: UserId): Promise<boolean> => {
    const subscription = await tracer.span("db.findSubscriptionByUserId", () =>
      subscriptionRepo.findSubscriptionByUserId(userId),
    );
    if (!subscription) {
      return false;
    }
    return subscription.canUseApiKey();
  };
}

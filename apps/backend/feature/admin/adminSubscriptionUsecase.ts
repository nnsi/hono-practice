import { AppError } from "@backend/error";
import type { SubscriptionRepository } from "@backend/feature/subscription/subscriptionRepository";
import type { UserRepository } from "@backend/feature/user/userRepository";
import type { Tracer } from "@backend/lib/tracer";
import {
  type Subscription,
  type SubscriptionPlan,
  type SubscriptionStatus,
  createSubscriptionId,
  newSubscription,
} from "@packages/domain/subscription/subscriptionSchema";
import { createUserId } from "@packages/domain/user/userSchema";

type AdminUpsertSubscriptionParams = {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
};

export type AdminSubscriptionUsecase = {
  getUserWithSubscription: (userId: string) => Promise<
    | {
        user: {
          id: string;
          loginId: string;
          name: string | null;
          createdAt: Date;
        };
        subscription: Subscription | null;
      }
    | undefined
  >;
  upsertSubscriptionManually: (
    userId: string,
    params: AdminUpsertSubscriptionParams,
  ) => Promise<Subscription>;
};

export function newAdminSubscriptionUsecase(
  userRepo: UserRepository,
  subscriptionRepo: SubscriptionRepository,
  tracer: Tracer,
): AdminSubscriptionUsecase {
  return {
    getUserWithSubscription: async (userId) => {
      const user = await tracer.span("db.getUserById", () =>
        userRepo.getUserById(createUserId(userId)),
      );
      if (!user) {
        return undefined;
      }
      const subscription = await tracer.span(
        "db.findSubscriptionByUserId",
        () => subscriptionRepo.findByUserId(createUserId(userId)),
      );
      return {
        user: {
          id: user.id,
          loginId: user.loginId ?? "",
          name: user.name ?? null,
          createdAt: user.type === "persisted" ? user.createdAt : new Date(),
        },
        subscription: subscription ?? null,
      };
    },

    upsertSubscriptionManually: async (userId, params) => {
      const user = await tracer.span("db.getUserById", () =>
        userRepo.getUserById(createUserId(userId)),
      );
      if (!user) {
        throw new AppError("User not found", 404);
      }

      const existing = await tracer.span("db.findSubscriptionByUserId", () =>
        subscriptionRepo.findByUserId(createUserId(userId)),
      );

      if (existing) {
        const updated = newSubscription({
          id: existing.id,
          userId: existing.userId,
          plan: params.plan,
          status: params.status,
          paymentProvider: "admin_manual",
          paymentProviderId: null,
          currentPeriodStart:
            params.currentPeriodStart !== undefined
              ? params.currentPeriodStart
              : existing.currentPeriodStart,
          currentPeriodEnd:
            params.currentPeriodEnd !== undefined
              ? params.currentPeriodEnd
              : existing.currentPeriodEnd,
          cancelAtPeriodEnd: existing.cancelAtPeriodEnd,
          cancelledAt: existing.cancelledAt,
          trialStart: existing.trialStart,
          trialEnd: existing.trialEnd,
          priceAmount: existing.priceAmount,
          priceCurrency: existing.priceCurrency,
          metadata: existing.metadata,
          createdAt: existing.createdAt,
          updatedAt: new Date(),
        });
        return tracer.span("db.updateSubscription", () =>
          subscriptionRepo.update(updated),
        );
      }

      const created = newSubscription({
        id: createSubscriptionId(),
        userId: createUserId(userId),
        plan: params.plan,
        status: params.status,
        paymentProvider: "admin_manual",
        paymentProviderId: null,
        currentPeriodStart: params.currentPeriodStart ?? null,
        currentPeriodEnd: params.currentPeriodEnd ?? null,
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
      return tracer.span("db.createSubscription", () =>
        subscriptionRepo.create(created),
      );
    },
  };
}

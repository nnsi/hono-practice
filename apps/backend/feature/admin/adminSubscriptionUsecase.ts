import { AppError } from "@backend/error";
import type { SubscriptionHistoryRepository } from "@backend/feature/subscription/subscriptionHistoryRepository";
import type { SubscriptionRepository } from "@backend/feature/subscription/subscriptionRepository";
import type { UserRepository } from "@backend/feature/user/userRepository";
import type { TransactionRunner } from "@backend/infra/rdb/db";
import type { Tracer } from "@backend/lib/tracer";
import type { SubscriptionHistory } from "@packages/domain/subscription/subscriptionHistorySchema";
import {
  createSubscriptionHistoryId,
  newSubscriptionHistory,
} from "@packages/domain/subscription/subscriptionHistorySchema";
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
        subscriptionHistory: SubscriptionHistory[];
      }
    | undefined
  >;
  upsertSubscriptionManually: (
    userId: string,
    params: AdminUpsertSubscriptionParams,
  ) => Promise<Subscription>;
};

export function newAdminSubscriptionUsecase(
  txRunner: TransactionRunner,
  userRepo: UserRepository,
  subscriptionRepo: SubscriptionRepository,
  historyRepo: SubscriptionHistoryRepository,
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
      const subscriptionHistory = subscription
        ? await tracer.span("db.findSubscriptionHistories", () =>
            historyRepo.findSubscriptionHistoriesBySubscriptionId(
              subscription.id,
            ),
          )
        : [];
      return {
        user: {
          id: user.id,
          loginId: user.loginId ?? "",
          name: user.name ?? null,
          createdAt: user.type === "persisted" ? user.createdAt : new Date(),
        },
        subscription: subscription ?? null,
        subscriptionHistory,
      };
    },

    upsertSubscriptionManually: async (userId, params) => {
      const user = await tracer.span("db.getUserById", () =>
        userRepo.getUserById(createUserId(userId)),
      );
      if (!user) {
        throw new AppError("User not found", 404);
      }

      return txRunner.run([subscriptionRepo, historyRepo], async (txRepos) => {
        const existing = await tracer.span("db.findSubscriptionByUserId", () =>
          txRepos.findByUserId(createUserId(userId)),
        );

        const now = new Date();
        let result: Subscription;
        let subscriptionId: Subscription["id"];

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
            updatedAt: now,
          });
          result = await tracer.span("db.updateSubscription", () =>
            txRepos.update(updated),
          );
          subscriptionId = existing.id;
        } else {
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
            createdAt: now,
            updatedAt: now,
          });
          result = await tracer.span("db.createSubscription", () =>
            txRepos.create(created),
          );
          subscriptionId = created.id;
        }

        const history = newSubscriptionHistory({
          id: createSubscriptionHistoryId(),
          subscriptionId,
          eventType: "admin_manual",
          plan: params.plan,
          status: params.status,
          source: "admin_manual",
          webhookId: null,
          createdAt: now,
        });
        await tracer.span("db.insertSubscriptionHistory", () =>
          txRepos.insertSubscriptionHistory(history),
        );

        return result;
      });
    },
  };
}

import type { TransactionRunner } from "@backend/infra/rdb/db";
import type { Tracer } from "@backend/lib/tracer";
import {
  createSubscriptionHistoryId,
  newSubscriptionHistory,
} from "@packages/domain/subscription/subscriptionHistorySchema";
import {
  type SubscriptionId,
  type SubscriptionPlan,
  type SubscriptionStatus,
  createSubscriptionId,
  newSubscription,
} from "@packages/domain/subscription/subscriptionSchema";
import { createUserId } from "@packages/domain/user/userSchema";

import type { SubscriptionHistoryRepository } from "./subscriptionHistoryRepository";
import type { SubscriptionRepository } from "./subscriptionRepository";

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

export type SubscriptionCommandUsecase = {
  upsertSubscriptionFromPayment: (
    params: UpsertSubscriptionFromPaymentParams,
  ) => Promise<void>;
};

export function newSubscriptionCommandUsecase(
  txRunner: TransactionRunner,
  subscriptionRepo: SubscriptionRepository,
  historyRepo: SubscriptionHistoryRepository,
  tracer: Tracer,
): SubscriptionCommandUsecase {
  return {
    upsertSubscriptionFromPayment: upsertSubscriptionFromPayment(
      txRunner,
      subscriptionRepo,
      historyRepo,
      tracer,
    ),
  };
}

function upsertSubscriptionFromPayment(
  txRunner: TransactionRunner,
  subscriptionRepo: SubscriptionRepository,
  historyRepo: SubscriptionHistoryRepository,
  tracer: Tracer,
) {
  return async (params: UpsertSubscriptionFromPaymentParams): Promise<void> => {
    const userId = createUserId(params.userId);

    await txRunner.run([subscriptionRepo, historyRepo], async (txRepos) => {
      const existing = await tracer.span("db.findSubscriptionByUserId", () =>
        txRepos.findSubscriptionByUserId(userId),
      );

      const now = new Date();
      let subscriptionId: SubscriptionId;

      if (existing) {
        const updated = newSubscription({
          ...existing,
          plan: params.plan,
          status: params.status,
          paymentProvider: params.paymentProvider,
          paymentProviderId: params.paymentProviderId,
          currentPeriodStart:
            params.currentPeriodStart ?? existing.currentPeriodStart,
          currentPeriodEnd:
            params.currentPeriodEnd ?? existing.currentPeriodEnd,
          cancelAtPeriodEnd:
            params.cancelAtPeriodEnd ?? existing.cancelAtPeriodEnd,
          priceAmount: params.priceAmount ?? existing.priceAmount,
          priceCurrency: params.priceCurrency ?? existing.priceCurrency,
          updatedAt: now,
        });
        await tracer.span("db.updateSubscription", () =>
          txRepos.updateSubscription(updated),
        );
        subscriptionId = existing.id;
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
          txRepos.createSubscription(sub),
        );
        subscriptionId = sub.id;
      }

      const history = newSubscriptionHistory({
        id: createSubscriptionHistoryId(),
        subscriptionId,
        eventType: params.eventType,
        plan: params.plan,
        status: params.status,
        source: params.paymentProvider ?? "unknown",
        webhookId: params.webhookId ?? null,
        createdAt: now,
      });
      await tracer.span("db.insertSubscriptionHistory", () =>
        txRepos.insertSubscriptionHistory(history),
      );
    });
  };
}

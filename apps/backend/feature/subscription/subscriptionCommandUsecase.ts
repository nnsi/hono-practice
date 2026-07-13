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
  trialStart?: Date;
  trialEnd?: Date;
  /** Provider occurrence time, never the time this worker received it. */
  eventOccurredAt: Date;
  /** Stable provider event ID used to break equal-timestamp ties. */
  eventSequence: string;
};

export type SubscriptionEventResult = "applied" | "ignored";

export type SubscriptionCommandUsecase = {
  upsertSubscriptionFromPayment: (
    params: UpsertSubscriptionFromPaymentParams,
  ) => Promise<SubscriptionEventResult>;
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
  return async (
    params: UpsertSubscriptionFromPaymentParams,
  ): Promise<SubscriptionEventResult> => {
    const userId = createUserId(params.userId);

    return txRunner.run([subscriptionRepo, historyRepo], async (txRepos) => {
      const existing = await tracer.span(
        "db.findSubscriptionByPaymentProviderId",
        () =>
          txRepos.findSubscriptionByPaymentProviderId(
            params.paymentProvider,
            params.paymentProviderId,
          ),
      );
      if (existing && existing.userId !== userId) return "ignored";

      const now = new Date();
      const currentPeriodEnd =
        params.currentPeriodEnd ?? existing?.currentPeriodEnd ?? null;
      const trialEnd = params.trialEnd ?? existing?.trialEnd ?? null;

      // Never grant entitlement from an incomplete or already elapsed provider
      // period. A later renewal can recover from expired through the transition
      // graph, but a delayed active snapshot cannot re-enable premium access.
      const periodIsValid =
        params.status === "trial"
          ? trialEnd !== null && trialEnd > now
          : params.status !== "active" ||
            (currentPeriodEnd !== null && currentPeriodEnd > now);
      const status = periodIsValid ? params.status : "expired";
      const plan = periodIsValid ? params.plan : "free";

      const candidate = newSubscription({
        ...(existing ?? {
          id: createSubscriptionId(),
          userId,
          cancelledAt: null,
          metadata: null,
          createdAt: now,
        }),
        plan,
        status,
        paymentProvider: params.paymentProvider,
        paymentProviderId: params.paymentProviderId,
        currentPeriodStart:
          params.currentPeriodStart ?? existing?.currentPeriodStart ?? null,
        currentPeriodEnd,
        cancelAtPeriodEnd:
          params.cancelAtPeriodEnd ?? existing?.cancelAtPeriodEnd ?? false,
        trialStart: params.trialStart ?? existing?.trialStart ?? null,
        trialEnd,
        priceAmount: params.priceAmount ?? existing?.priceAmount ?? null,
        priceCurrency: params.priceCurrency ?? existing?.priceCurrency ?? "JPY",
        lastEventOccurredAt: params.eventOccurredAt,
        lastEventSequence: params.eventSequence,
        updatedAt: now,
      });

      const applied = await tracer.span(
        "db.applyOrderedSubscriptionEvent",
        () => txRepos.applyOrderedSubscriptionEvent(candidate),
      );
      if (!applied) return "ignored";

      const subscriptionId: SubscriptionId = applied.id;

      const history = newSubscriptionHistory({
        id: createSubscriptionHistoryId(),
        subscriptionId,
        eventType: params.eventType,
        plan,
        status,
        source: params.paymentProvider ?? "unknown",
        webhookId: params.webhookId ?? null,
        createdAt: now,
      });
      await tracer.span("db.insertSubscriptionHistory", () =>
        txRepos.insertSubscriptionHistory(history),
      );
      return "applied";
    });
  };
}

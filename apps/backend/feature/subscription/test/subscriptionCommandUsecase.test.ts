import type { TransactionRunner } from "@backend/infra/rdb/db";
import { noopTracer } from "@backend/lib/tracer";
import {
  type Subscription,
  createSubscriptionId,
  newSubscription,
} from "@packages/domain/subscription/subscriptionSchema";
import { createUserId } from "@packages/domain/user/userSchema";
import { anything, instance, mock, reset, verify, when } from "ts-mockito";
import { beforeEach, describe, expect, it } from "vitest";

import type { SubscriptionRepository } from "..";
import { newSubscriptionCommandUsecase } from "../subscriptionCommandUsecase";
import type { SubscriptionHistoryRepository } from "../subscriptionHistoryRepository";

const fakeTxRunner: TransactionRunner = {
  async run(repositories, operation) {
    const merged = Object.assign({}, ...repositories);
    return operation(merged);
  },
};

describe("SubscriptionCommandUsecase", () => {
  let repo: SubscriptionRepository;
  let historyRepo: SubscriptionHistoryRepository;
  let usecase: ReturnType<typeof newSubscriptionCommandUsecase>;

  const userId1 = createUserId("00000000-0000-4000-8000-000000000000");
  const subscriptionId1 = createSubscriptionId(
    "00000000-0000-4000-8000-000000000001",
  );

  const mockSubscription: Subscription = newSubscription({
    id: subscriptionId1,
    userId: userId1,
    plan: "premium",
    status: "active",
    paymentProvider: "stripe",
    paymentProviderId: "sub_123",
    currentPeriodStart: new Date("2024-01-01"),
    currentPeriodEnd: new Date("2030-02-01"),
    cancelAtPeriodEnd: false,
    cancelledAt: null,
    trialStart: null,
    trialEnd: null,
    priceAmount: 1000,
    priceCurrency: "USD",
    metadata: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  });

  beforeEach(() => {
    repo = mock<SubscriptionRepository>();
    historyRepo = mock<SubscriptionHistoryRepository>();
    usecase = newSubscriptionCommandUsecase(
      fakeTxRunner,
      instance(repo),
      instance(historyRepo),
      noopTracer,
    );
    reset(repo);
    reset(historyRepo);
  });

  describe("upsertSubscriptionFromPayment", () => {
    it("should update existing subscription and record history", async () => {
      when(
        repo.findSubscriptionByPaymentProviderId("polar", "sub_456"),
      ).thenResolve(mockSubscription);
      when(repo.applyOrderedSubscriptionEvent(anything())).thenResolve(
        mockSubscription,
      );
      when(historyRepo.insertSubscriptionHistory(anything())).thenResolve(
        undefined,
      );

      await usecase.upsertSubscriptionFromPayment({
        userId: userId1,
        plan: "premium",
        status: "active",
        paymentProvider: "polar",
        paymentProviderId: "sub_456",
        eventType: "subscription.updated",
        currentPeriodEnd: new Date("2030-03-01"),
        eventOccurredAt: new Date("2026-07-01"),
        eventSequence: "evt-2",
      });

      verify(
        repo.findSubscriptionByPaymentProviderId("polar", "sub_456"),
      ).once();
      verify(repo.applyOrderedSubscriptionEvent(anything())).once();
      verify(historyRepo.insertSubscriptionHistory(anything())).once();
    });

    it("should create new subscription and record history when none exists", async () => {
      when(
        repo.findSubscriptionByPaymentProviderId("polar", "sub_789"),
      ).thenResolve(undefined);
      when(repo.applyOrderedSubscriptionEvent(anything())).thenResolve(
        mockSubscription,
      );
      when(historyRepo.insertSubscriptionHistory(anything())).thenResolve(
        undefined,
      );

      await usecase.upsertSubscriptionFromPayment({
        userId: userId1,
        plan: "premium",
        status: "active",
        paymentProvider: "polar",
        paymentProviderId: "sub_789",
        eventType: "subscription.created",
        currentPeriodEnd: new Date("2030-03-01"),
        eventOccurredAt: new Date("2026-07-01"),
        eventSequence: "evt-1",
      });

      verify(
        repo.findSubscriptionByPaymentProviderId("polar", "sub_789"),
      ).once();
      verify(repo.applyOrderedSubscriptionEvent(anything())).once();
      verify(historyRepo.insertSubscriptionHistory(anything())).once();
    });

    it("does not record history when the atomic repository rejects a stale event", async () => {
      when(
        repo.findSubscriptionByPaymentProviderId("revenuecat", "sub_123"),
      ).thenResolve(mockSubscription);
      when(repo.applyOrderedSubscriptionEvent(anything())).thenResolve(
        undefined,
      );

      const result = await usecase.upsertSubscriptionFromPayment({
        userId: userId1,
        plan: "free",
        status: "expired",
        paymentProvider: "revenuecat",
        paymentProviderId: "sub_123",
        eventType: "EXPIRATION",
        webhookId: "evt-old",
        eventOccurredAt: new Date("2026-06-01"),
        eventSequence: "evt-old",
      });

      expect(result).toBe("ignored");
      verify(historyRepo.insertSubscriptionHistory(anything())).never();
    });

    it("downgrades an active event with an elapsed period instead of granting entitlement", async () => {
      let appliedSubscription: Subscription | undefined;
      when(
        repo.findSubscriptionByPaymentProviderId("polar", "sub_elapsed"),
      ).thenResolve(undefined);
      when(repo.applyOrderedSubscriptionEvent(anything())).thenCall(
        async (subscription: Subscription) => {
          appliedSubscription = subscription;
          return subscription;
        },
      );
      when(historyRepo.insertSubscriptionHistory(anything())).thenResolve(
        undefined,
      );

      const result = await usecase.upsertSubscriptionFromPayment({
        userId: userId1,
        plan: "premium",
        status: "active",
        paymentProvider: "polar",
        paymentProviderId: "sub_elapsed",
        eventType: "subscription.active",
        currentPeriodEnd: new Date("2020-01-01"),
        eventOccurredAt: new Date("2020-01-01"),
        eventSequence: "evt-elapsed",
      });

      expect(result).toBe("applied");
      expect(appliedSubscription).toMatchObject({
        plan: "free",
        status: "expired",
      });
    });
  });
});

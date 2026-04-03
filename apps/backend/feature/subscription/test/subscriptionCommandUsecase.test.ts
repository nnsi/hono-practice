import type { TransactionRunner } from "@backend/infra/rdb/db";
import { noopTracer } from "@backend/lib/tracer";
import {
  type Subscription,
  createSubscriptionId,
  newSubscription,
} from "@packages/domain/subscription/subscriptionSchema";
import { createUserId } from "@packages/domain/user/userSchema";
import { anything, instance, mock, reset, verify, when } from "ts-mockito";
import { beforeEach, describe, it } from "vitest";

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
    currentPeriodEnd: new Date("2024-02-01"),
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
      when(repo.findSubscriptionByUserId(userId1)).thenResolve(
        mockSubscription,
      );
      when(repo.updateSubscription(anything())).thenResolve(mockSubscription);
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
      });

      verify(repo.findSubscriptionByUserId(userId1)).once();
      verify(repo.updateSubscription(anything())).once();
      verify(historyRepo.insertSubscriptionHistory(anything())).once();
    });

    it("should create new subscription and record history when none exists", async () => {
      when(repo.findSubscriptionByUserId(userId1)).thenResolve(undefined);
      when(repo.createSubscription(anything())).thenResolve(mockSubscription);
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
      });

      verify(repo.findSubscriptionByUserId(userId1)).once();
      verify(repo.createSubscription(anything())).once();
      verify(historyRepo.insertSubscriptionHistory(anything())).once();
    });
  });
});

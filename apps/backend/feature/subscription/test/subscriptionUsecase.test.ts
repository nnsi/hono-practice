import {
  type Subscription,
  createSubscriptionId,
  createUserId,
  newSubscription,
} from "@backend/domain";
import { ResourceNotFoundError } from "@backend/error";
import { instance, mock, reset, verify, when } from "ts-mockito";
import { beforeEach, describe, expect, it } from "vitest";

import type { SubscriptionRepository } from "..";
import { newSubscriptionUsecase } from "..";

describe("SubscriptionUsecase", () => {
  let repo: SubscriptionRepository;
  let usecase: ReturnType<typeof newSubscriptionUsecase>;

  beforeEach(() => {
    repo = mock<SubscriptionRepository>();
    usecase = newSubscriptionUsecase(instance(repo));
    reset(repo);
  });

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

  describe("getSubscriptionByUserId", () => {
    it("should return subscription when exists", async () => {
      when(repo.findByUserId(userId1)).thenResolve(mockSubscription);

      const result = await usecase.getSubscriptionByUserId(userId1);

      expect(result).toEqual(mockSubscription);
      verify(repo.findByUserId(userId1)).once();
    });

    it("should throw ResourceNotFoundError when subscription not found", async () => {
      when(repo.findByUserId(userId1)).thenResolve(undefined);

      await expect(usecase.getSubscriptionByUserId(userId1)).rejects.toThrow(
        ResourceNotFoundError,
      );
    });
  });

  describe("getSubscriptionByUserIdOrDefault", () => {
    it("should return subscription when exists", async () => {
      when(repo.findByUserId(userId1)).thenResolve(mockSubscription);

      const result = await usecase.getSubscriptionByUserIdOrDefault(userId1);

      expect(result).toEqual(mockSubscription);
      verify(repo.findByUserId(userId1)).once();
    });

    it("should return default free subscription when not found", async () => {
      when(repo.findByUserId(userId1)).thenResolve(undefined);

      const result = await usecase.getSubscriptionByUserIdOrDefault(userId1);

      expect(result.userId).toEqual(userId1);
      expect(result.plan).toEqual("free");
      expect(result.status).toEqual("active");
      expect(result.canUseApiKey()).toBe(false);
      verify(repo.findByUserId(userId1)).once();
    });
  });

  describe("canUserAccessApiKey", () => {
    it("should return true when user has active premium subscription", async () => {
      when(repo.findByUserId(userId1)).thenResolve(mockSubscription);

      const result = await usecase.canUserAccessApiKey(userId1);

      expect(result).toBe(true);
      verify(repo.findByUserId(userId1)).once();
    });

    it("should return false when subscription not found", async () => {
      when(repo.findByUserId(userId1)).thenResolve(undefined);

      const result = await usecase.canUserAccessApiKey(userId1);

      expect(result).toBe(false);
      verify(repo.findByUserId(userId1)).once();
    });

    it("should return false when subscription is free plan", async () => {
      const freeSubscription = newSubscription({
        ...mockSubscription,
        plan: "free",
      });
      when(repo.findByUserId(userId1)).thenResolve(freeSubscription);

      const result = await usecase.canUserAccessApiKey(userId1);

      expect(result).toBe(false);
    });
  });
});

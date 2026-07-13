import {
  createSubscriptionId,
  newSubscription,
} from "@packages/domain/subscription/subscriptionSchema";
import { createUserId } from "@packages/domain/user/userSchema";
import { describe, expect, it, vi } from "vitest";

import { newSubscriptionHandler } from "../subscriptionHandler";
import type { SubscriptionQueryUsecase } from "../subscriptionUsecase";

const userId = createUserId("00000000-0000-4000-8000-000000000000");

function makeUsecase(currentPeriodEnd: Date | null): SubscriptionQueryUsecase {
  const subscription = newSubscription({
    id: createSubscriptionId("00000000-0000-4000-8000-000000000001"),
    userId,
    plan: "premium",
    status: "active",
    paymentProvider: "polar",
    paymentProviderId: "sub_1",
    currentPeriodStart: new Date("2026-01-01"),
    currentPeriodEnd,
    cancelAtPeriodEnd: false,
    cancelledAt: null,
    trialStart: null,
    trialEnd: null,
    priceAmount: 550,
    priceCurrency: "JPY",
    metadata: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  });
  return {
    getSubscriptionByUserId: vi.fn().mockResolvedValue(subscription),
    getSubscriptionByUserIdOrDefault: vi.fn().mockResolvedValue(subscription),
    getSubscriptionByPaymentProviderId: vi.fn().mockResolvedValue(subscription),
    canUserAccessApiKey: vi.fn().mockResolvedValue(subscription.canUseApiKey()),
  };
}

describe("subscription response effective entitlement", () => {
  it.each([
    null,
    new Date("2020-01-01"),
  ])("projects elapsed active period %s to free", async (periodEnd) => {
    const response = await newSubscriptionHandler(
      makeUsecase(periodEnd),
    ).getSubscription(userId);

    expect(response).toMatchObject({
      plan: "free",
      status: "active",
      canUseApiKey: false,
    });
  });

  it("keeps a future active period premium", async () => {
    const response = await newSubscriptionHandler(
      makeUsecase(new Date("2099-01-01")),
    ).getSubscription(userId);

    expect(response).toMatchObject({
      plan: "premium",
      status: "active",
      canUseApiKey: true,
    });
  });
});

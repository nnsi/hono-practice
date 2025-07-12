import type { Next } from "hono";

import {
  createSubscriptionId,
  newSubscription,
} from "@backend/domain/subscription";

import type { HonoContext } from "@backend/context";

export async function mockPremiumMiddleware(c: HonoContext, next: Next) {
  // テスト用のプレミアムサブスクリプションを常に持っていることにする
  const userId = c.get("userId");

  if (!userId) {
    throw new Error("User not authenticated");
  }

  // モックのプレミアムサブスクリプションを作成
  const mockSubscription = newSubscription({
    id: createSubscriptionId(),
    userId: userId,
    plan: "premium",
    status: "active",
    paymentProvider: "stripe",
    paymentProviderId: "sub_test_123",
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    cancelAtPeriodEnd: false,
    cancelledAt: null,
    trialStart: null,
    trialEnd: null,
    priceAmount: 1980,
    priceCurrency: "JPY",
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  c.set("subscription", mockSubscription);

  await next();
}

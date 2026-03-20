import type { MiddlewareHandler } from "hono";

import type { AppContext } from "@backend/context";
import { UnauthorizedError } from "@backend/error";
import { newSubscriptionRepository } from "@backend/feature/subscription/subscriptionRepository";

import { mockPremiumMiddleware } from "./mockPremiumMiddleware";

const prodPremiumMiddleware: MiddlewareHandler<AppContext> = async (
  c,
  next,
) => {
  // 既にauthMiddlewareを通過していることを前提とする
  const userId = c.get("userId");

  if (!userId) {
    throw new UnauthorizedError("User not authenticated");
  }

  const db = c.env.DB;
  const subscriptionRepo = newSubscriptionRepository(db);
  const subscription = await subscriptionRepo.findByUserId(userId);

  if (!subscription) {
    throw new UnauthorizedError(
      "No subscription found. Please upgrade to premium plan.",
    );
  }

  if (!subscription.canUseApiKey()) {
    throw new UnauthorizedError(
      "Premium subscription required to access this feature.",
    );
  }

  // サブスクリプション情報をコンテキストに追加
  c.set("subscription", subscription);

  await next();
};

/** 環境に応じてprod/mockを切り替えるミドルウェア */
export const premiumMiddleware: MiddlewareHandler<AppContext> = async (
  c,
  next,
) => {
  if (c.env.NODE_ENV === "test") {
    return mockPremiumMiddleware(c, next);
  }
  return prodPremiumMiddleware(c, next);
};

import type { Next } from "hono";

import type { HonoContext } from "@backend/context";
import { UnauthorizedError } from "@backend/error";
import { newSubscriptionRepository } from "@backend/feature/subscription/subscriptionRepository";

export async function premiumMiddleware(c: HonoContext, next: Next) {
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
}

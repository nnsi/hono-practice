import { Hono } from "hono";

import type { AppContext } from "@backend/context";
import { AppError } from "@backend/error";
import { noopTracer } from "@backend/lib/tracer";

import { newSubscriptionRepository } from "../subscription/subscriptionRepository";
import { newSubscriptionUsecase } from "../subscription/subscriptionUsecase";

type RevenueCatWebhookContext = AppContext & {
  Variables: {
    subscriptionUsecase: ReturnType<typeof newSubscriptionUsecase>;
  };
};

type RevenueCatEvent = {
  event: {
    type: string;
    app_user_id: string;
    product_id?: string;
    expiration_at_ms?: number;
    original_transaction_id?: string;
    id: string;
  };
};

export function createRevenueCatWebhookRoute() {
  const app = new Hono<RevenueCatWebhookContext>();

  app.use("*", async (c, next) => {
    const db = c.env.DB;
    const tracer = c.get("tracer") ?? noopTracer;
    const repo = newSubscriptionRepository(db);
    const uc = newSubscriptionUsecase(repo, tracer);

    c.set("subscriptionUsecase", uc);

    return next();
  });

  return app.post("/", async (c) => {
    const authKey = c.env.REVENUECAT_WEBHOOK_AUTH_KEY;
    if (!authKey) {
      throw new AppError("RevenueCat webhook auth key not configured", 500);
    }

    const authHeader = c.req.header("Authorization");
    if (authHeader !== `Bearer ${authKey}`) {
      throw new AppError("Unauthorized", 401);
    }

    const body = (await c.req.json()) as RevenueCatEvent;
    const event = body.event;
    const uc = c.var.subscriptionUsecase;
    const userId = event.app_user_id;
    const providerId = event.original_transaction_id ?? event.id;

    const expirationDate = event.expiration_at_ms
      ? new Date(event.expiration_at_ms)
      : undefined;

    switch (event.type) {
      case "INITIAL_PURCHASE":
      case "RENEWAL": {
        await uc.upsertSubscriptionFromPayment({
          userId,
          plan: "premium",
          status: "active",
          paymentProvider: "revenuecat",
          paymentProviderId: providerId,
          currentPeriodEnd: expirationDate,
        });
        break;
      }

      // CANCELLATION = 期間終了時にキャンセル予定。現在の期間中はまだ有効なので plan: "premium" を維持
      case "CANCELLATION": {
        await uc.upsertSubscriptionFromPayment({
          userId,
          plan: "premium",
          status: "active",
          paymentProvider: "revenuecat",
          paymentProviderId: providerId,
          cancelAtPeriodEnd: true,
        });
        break;
      }

      case "EXPIRATION": {
        await uc.upsertSubscriptionFromPayment({
          userId,
          plan: "free",
          status: "expired",
          paymentProvider: "revenuecat",
          paymentProviderId: providerId,
        });
        break;
      }
    }

    return c.json({ received: true }, 200);
  });
}

export const revenueCatWebhookRoute = createRevenueCatWebhookRoute();

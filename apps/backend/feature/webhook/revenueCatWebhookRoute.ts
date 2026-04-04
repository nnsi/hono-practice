import { Hono } from "hono";

import type { AppContext } from "@backend/context";
import { AppError } from "@backend/error";
import { newDrizzleTransactionRunner } from "@backend/infra/rdb/drizzle/drizzleTransaction";
import { noopTracer } from "@backend/lib/tracer";
import { z } from "zod";

import {
  type SubscriptionCommandUsecase,
  newSubscriptionCommandUsecase,
} from "../subscription/subscriptionCommandUsecase";
import { newSubscriptionHistoryRepository } from "../subscription/subscriptionHistoryRepository";
import { newSubscriptionRepository } from "../subscription/subscriptionRepository";

type RevenueCatWebhookContext = AppContext & {
  Variables: {
    commandUc: SubscriptionCommandUsecase;
  };
};

const revenueCatEventSchema = z.object({
  event: z.object({
    type: z.string(),
    app_user_id: z.string(),
    product_id: z.string().optional(),
    expiration_at_ms: z.number().optional(),
    original_transaction_id: z.string().optional(),
    id: z.string(),
  }),
});

export function createRevenueCatWebhookRoute(deps?: {
  commandUc: SubscriptionCommandUsecase;
}) {
  const app = new Hono<RevenueCatWebhookContext>();

  app.use("*", async (c, next) => {
    if (deps) {
      c.set("commandUc", deps.commandUc);
    } else {
      const db = c.env.DB;
      const tracer = c.get("tracer") ?? noopTracer;
      const repo = newSubscriptionRepository(db);
      const historyRepo = newSubscriptionHistoryRepository(db);
      const txRunner = newDrizzleTransactionRunner(db);
      c.set(
        "commandUc",
        newSubscriptionCommandUsecase(txRunner, repo, historyRepo, tracer),
      );
    }
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

    const parsed = revenueCatEventSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      throw new AppError("Invalid webhook payload", 400);
    }
    const body = parsed.data;
    const event = body.event;
    const { commandUc } = c.var;
    const userId = event.app_user_id;
    const providerId = event.original_transaction_id ?? event.id;

    const expirationDate = event.expiration_at_ms
      ? new Date(event.expiration_at_ms)
      : undefined;

    switch (event.type) {
      case "INITIAL_PURCHASE":
      case "RENEWAL": {
        await commandUc.upsertSubscriptionFromPayment({
          userId,
          plan: "premium",
          status: "active",
          paymentProvider: "revenuecat",
          paymentProviderId: providerId,
          currentPeriodEnd: expirationDate,
          eventType: event.type,
          webhookId: event.id,
        });
        break;
      }

      // CANCELLATION = 期間終了時にキャンセル予定。現在の期間中はまだ有効なので plan: "premium" を維持
      case "CANCELLATION": {
        await commandUc.upsertSubscriptionFromPayment({
          userId,
          plan: "premium",
          status: "active",
          paymentProvider: "revenuecat",
          paymentProviderId: providerId,
          cancelAtPeriodEnd: true,
          eventType: event.type,
          webhookId: event.id,
        });
        break;
      }

      case "EXPIRATION": {
        await commandUc.upsertSubscriptionFromPayment({
          userId,
          plan: "free",
          status: "expired",
          paymentProvider: "revenuecat",
          paymentProviderId: providerId,
          eventType: event.type,
          webhookId: event.id,
        });
        break;
      }
    }

    return c.json({ received: true }, 200);
  });
}

export const revenueCatWebhookRoute = createRevenueCatWebhookRoute();

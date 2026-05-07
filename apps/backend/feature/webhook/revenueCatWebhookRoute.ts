import { Hono } from "hono";

import type { AppContext } from "@backend/context";
import { AppError } from "@backend/error";
import { newDrizzleTransactionRunner } from "@backend/infra/rdb/drizzle/drizzleTransaction";
import { noopLogger } from "@backend/lib/logger";
import { timingSafeEqual } from "@backend/lib/timingSafeEqual";
import { noopTracer } from "@backend/lib/tracer";
import { z } from "zod";

import {
  type SubscriptionCommandUsecase,
  newSubscriptionCommandUsecase,
} from "../subscription/subscriptionCommandUsecase";
import { newSubscriptionHistoryRepository } from "../subscription/subscriptionHistoryRepository";
import { newSubscriptionRepository } from "../subscription/subscriptionRepository";
import { handleRevenueCatEvent } from "./revenueCatEventHandler";

const ANONYMOUS_USER_ID_PREFIX = "$RCAnonymousID:";

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
    if (
      !authHeader ||
      !(await timingSafeEqual(authHeader, `Bearer ${authKey}`))
    ) {
      throw new AppError("Unauthorized", 401);
    }

    const parsed = revenueCatEventSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      throw new AppError("Invalid webhook payload", 400);
    }

    const event = parsed.data.event;
    const logger = c.get("logger") ?? noopLogger;

    // M5: Anonymous RC user IDs ($RCAnonymousID:xxxx) arrive before the user
    // has called Purchases.logIn(). Passing them to createUserId() causes a
    // DomainValidateError → 400 → infinite RC retry loop. Return 200 early.
    if (event.app_user_id.startsWith(ANONYMOUS_USER_ID_PREFIX)) {
      logger.info("revenuecat_anonymous_user_skipped", {
        eventType: event.type,
        webhookId: event.id,
      });
      return c.json({ ok: true, skipped: "anonymous" }, 200);
    }

    await handleRevenueCatEvent(event, c.var.commandUc, logger);

    return c.json({ received: true }, 200);
  });
}

export const revenueCatWebhookRoute = createRevenueCatWebhookRoute();

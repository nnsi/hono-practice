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
    app_user_id: z.string().optional(),
    product_id: z.string().optional(),
    expiration_at_ms: z.number().int().nonnegative().nullish(),
    grace_period_expiration_at_ms: z.number().int().nonnegative().nullish(),
    entitlement_ids: z.array(z.string()).nullish(),
    cancel_reason: z.string().nullish(),
    event_timestamp_ms: z.number().int().nonnegative(),
    environment: z.enum(["SANDBOX", "PRODUCTION"]).optional(),
    original_transaction_id: z
      .string()
      .nullish()
      .transform((value) => value ?? undefined),
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

    // Dashboard test deliveries don't represent a purchase and may omit environment.
    if (event.type === "TEST") {
      return c.json({ received: true, skipped: "test" }, 200);
    }

    // Restore policy is "Keep with original App User ID". A transfer requires
    // reconciliation of both customers; never silently acknowledge one.
    if (event.type === "TRANSFER") {
      logger.error("revenuecat_transfer_requires_reconciliation", {
        webhookId: event.id,
      });
      throw new AppError("RevenueCat transfer requires reconciliation", 503);
    }
    if (!event.app_user_id) {
      throw new AppError("RevenueCat app_user_id is required", 400);
    }

    // Fail closed: preview binaries may use the production API/DB. Never let
    // their sandbox purchases change real entitlements, even with a valid key.
    const expectedEnvironment = ["development", "test", "stg"].includes(
      c.env.NODE_ENV,
    )
      ? "SANDBOX"
      : "PRODUCTION";
    if (!event.environment) {
      throw new AppError("RevenueCat event environment is required", 400);
    }
    if (event.environment !== expectedEnvironment) {
      logger.warn("revenuecat_environment_skipped", {
        webhookId: event.id,
        environment: event.environment,
        expectedEnvironment,
      });
      return c.json({ received: true, skipped: "environment" }, 200);
    }

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

    await handleRevenueCatEvent(
      { ...event, app_user_id: event.app_user_id },
      c.var.commandUc,
      logger,
    );

    return c.json({ received: true }, 200);
  });
}

export const revenueCatWebhookRoute = createRevenueCatWebhookRoute();

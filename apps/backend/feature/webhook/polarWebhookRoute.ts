import { Hono } from "hono";

import type { AppContext } from "@backend/context";
import { AppError } from "@backend/error";
import { newDrizzleTransactionRunner } from "@backend/infra/rdb/drizzle/drizzleTransaction";
import { noopTracer } from "@backend/lib/tracer";

import type { SubscriptionCommandUsecase } from "../subscription/subscriptionCommandUsecase";
import { newSubscriptionCommandUsecase } from "../subscription/subscriptionCommandUsecase";
import { newSubscriptionHistoryRepository } from "../subscription/subscriptionHistoryRepository";
import { newSubscriptionRepository } from "../subscription/subscriptionRepository";
import type { SubscriptionQueryUsecase } from "../subscription/subscriptionUsecase";
import { newSubscriptionQueryUsecase } from "../subscription/subscriptionUsecase";
import { verifyPolarSignature } from "./polarSignature";
import { POLAR_STATUS_MAP, resolvePlan } from "./polarSubscriptionMapping";
import {
  isPolarSubscriptionEvent,
  polarWebhookPayloadSchema,
} from "./polarWebhookSchema";

type PolarWebhookContext = AppContext & {
  Variables: {
    queryUc: SubscriptionQueryUsecase;
    commandUc: SubscriptionCommandUsecase;
  };
};

export function createPolarWebhookRoute(deps?: {
  commandUc: SubscriptionCommandUsecase;
  queryUc: SubscriptionQueryUsecase;
}) {
  const app = new Hono<PolarWebhookContext>();

  app.use("*", async (c, next) => {
    if (deps) {
      c.set("commandUc", deps.commandUc);
      c.set("queryUc", deps.queryUc);
    } else {
      const db = c.env.DB;
      const tracer = c.get("tracer") ?? noopTracer;
      const repo = newSubscriptionRepository(db);
      const historyRepo = newSubscriptionHistoryRepository(db);
      const txRunner = newDrizzleTransactionRunner(db);
      c.set("queryUc", newSubscriptionQueryUsecase(repo, tracer));
      c.set(
        "commandUc",
        newSubscriptionCommandUsecase(txRunner, repo, historyRepo, tracer),
      );
    }
    return next();
  });

  return app.post("/", async (c) => {
    const secret = c.env.POLAR_WEBHOOK_SECRET;
    if (!secret) {
      throw new AppError("Polar webhook secret not configured", 500);
    }

    const webhookId = c.req.header("webhook-id");
    const webhookTimestamp = c.req.header("webhook-timestamp");
    const webhookSignature = c.req.header("webhook-signature");

    if (!webhookId || !webhookTimestamp || !webhookSignature) {
      throw new AppError("Missing webhook signature headers", 400);
    }

    const rawBody = await c.req.text();
    const valid = await verifyPolarSignature(
      rawBody,
      webhookId,
      webhookTimestamp,
      webhookSignature,
      secret,
    );
    if (!valid) {
      throw new AppError("Invalid signature", 400);
    }

    const rawPayload = JSON.parse(rawBody);
    // Malformed or unknown event types (e.g. order.*) → accept without processing
    if (
      typeof rawPayload?.type !== "string" ||
      !isPolarSubscriptionEvent(rawPayload.type)
    ) {
      return c.json({ received: true }, 200);
    }

    const parsed = polarWebhookPayloadSchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new AppError("Invalid webhook payload", 400);
    }
    const payload = parsed.data;
    const { queryUc, commandUc } = c.var;
    const sub = payload.data;

    async function resolveUserId(): Promise<string | undefined> {
      const userId = sub.metadata.userId;
      if (userId) return userId;
      const existing = await queryUc.getSubscriptionByPaymentProviderId(sub.id);
      return existing?.userId;
    }

    switch (payload.type) {
      case "subscription.created": {
        const userId = await resolveUserId();
        if (!userId) break;
        await commandUc.upsertSubscriptionFromPayment({
          userId,
          plan: "premium",
          status: "active",
          paymentProvider: "polar",
          paymentProviderId: sub.id,
          eventType: "subscription.created",
          webhookId,
          currentPeriodStart: new Date(sub.current_period_start),
          currentPeriodEnd: new Date(sub.current_period_end),
        });
        break;
      }

      case "subscription.updated":
      case "subscription.active": {
        const resolvedUserId = await resolveUserId();
        if (!resolvedUserId) break;
        const status = POLAR_STATUS_MAP[sub.status] ?? "expired";
        await commandUc.upsertSubscriptionFromPayment({
          userId: resolvedUserId,
          plan: resolvePlan(status),
          status,
          paymentProvider: "polar",
          paymentProviderId: sub.id,
          eventType: payload.type,
          webhookId,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          currentPeriodStart: new Date(sub.current_period_start),
          currentPeriodEnd: new Date(sub.current_period_end),
        });
        break;
      }

      case "subscription.canceled": {
        const resolvedUserId = await resolveUserId();
        if (!resolvedUserId) break;
        await commandUc.upsertSubscriptionFromPayment({
          userId: resolvedUserId,
          plan: "premium",
          status: "active",
          paymentProvider: "polar",
          paymentProviderId: sub.id,
          eventType: "subscription.canceled",
          webhookId,
          cancelAtPeriodEnd: true,
          currentPeriodStart: new Date(sub.current_period_start),
          currentPeriodEnd: new Date(sub.current_period_end),
        });
        break;
      }

      case "subscription.revoked": {
        const resolvedUserId = await resolveUserId();
        if (!resolvedUserId) break;
        await commandUc.upsertSubscriptionFromPayment({
          userId: resolvedUserId,
          plan: "free",
          status: "cancelled",
          paymentProvider: "polar",
          paymentProviderId: sub.id,
          eventType: "subscription.revoked",
          webhookId,
        });
        break;
      }
    }

    return c.json({ received: true }, 200);
  });
}

export const polarWebhookRoute = createPolarWebhookRoute();

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
import { handlePolarSubscriptionEvent } from "./polarEventHandler";
import { verifyPolarSignature } from "./polarSignature";
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
    const { queryUc, commandUc } = c.var;
    await handlePolarSubscriptionEvent(
      {
        type: rawPayload.type,
        data: parsed.data.data,
        webhookId,
      },
      queryUc,
      commandUc,
    );

    return c.json({ received: true }, 200);
  });
}

export const polarWebhookRoute = createPolarWebhookRoute();

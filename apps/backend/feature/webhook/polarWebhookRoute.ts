import { Hono } from "hono";

import type { AppContext } from "@backend/context";
import { AppError } from "@backend/error";
import { noopTracer } from "@backend/lib/tracer";
import type { SubscriptionStatus } from "@packages/domain/subscription/subscriptionSchema";

import { newSubscriptionRepository } from "../subscription/subscriptionRepository";
import { newSubscriptionUsecase } from "../subscription/subscriptionUsecase";
import { verifyPolarSignature } from "./polarSignature";

type PolarWebhookContext = AppContext & {
  Variables: {
    subscriptionUsecase: ReturnType<typeof newSubscriptionUsecase>;
  };
};

type PolarSubscription = {
  id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  user: { id: string; email: string };
  metadata: { userId?: string };
  product: { id: string; name: string };
};

type PolarWebhookPayload = {
  type: string;
  data: PolarSubscription;
};

const POLAR_STATUS_MAP: Record<string, SubscriptionStatus> = {
  active: "active",
  past_due: "active",
  trialing: "trial",
  incomplete: "paused",
  canceled: "cancelled",
  unpaid: "expired",
};

function resolvePlan(status: SubscriptionStatus): "free" | "premium" {
  return status === "expired" || status === "cancelled" ? "free" : "premium";
}

export function createPolarWebhookRoute() {
  const app = new Hono<PolarWebhookContext>();

  app.use("*", async (c, next) => {
    const db = c.env.DB;
    const tracer = c.get("tracer") ?? noopTracer;
    const repo = newSubscriptionRepository(db);
    const uc = newSubscriptionUsecase(repo, tracer);
    c.set("subscriptionUsecase", uc);
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

    const payload = JSON.parse(rawBody) as PolarWebhookPayload;
    const uc = c.var.subscriptionUsecase;
    const sub = payload.data;

    switch (payload.type) {
      case "subscription.created": {
        const userId = sub.metadata.userId;
        if (!userId) break;

        await uc.upsertSubscriptionFromPayment({
          userId,
          plan: "premium",
          status: "active",
          paymentProvider: "polar",
          paymentProviderId: sub.id,
          currentPeriodStart: new Date(sub.current_period_start),
          currentPeriodEnd: new Date(sub.current_period_end),
        });
        break;
      }

      case "subscription.updated":
      case "subscription.active": {
        const userId = sub.metadata.userId;
        const existing = userId
          ? undefined
          : await uc.getSubscriptionByPaymentProviderId(sub.id);
        const resolvedUserId = userId ?? existing?.userId;
        if (!resolvedUserId) break;

        const status = POLAR_STATUS_MAP[sub.status] ?? "expired";
        await uc.upsertSubscriptionFromPayment({
          userId: resolvedUserId,
          plan: resolvePlan(status),
          status,
          paymentProvider: "polar",
          paymentProviderId: sub.id,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          currentPeriodStart: new Date(sub.current_period_start),
          currentPeriodEnd: new Date(sub.current_period_end),
        });
        break;
      }

      case "subscription.canceled": {
        const userId = sub.metadata.userId;
        const existing = userId
          ? undefined
          : await uc.getSubscriptionByPaymentProviderId(sub.id);
        const resolvedUserId = userId ?? existing?.userId;
        if (!resolvedUserId) break;

        await uc.upsertSubscriptionFromPayment({
          userId: resolvedUserId,
          plan: "premium",
          status: "active",
          paymentProvider: "polar",
          paymentProviderId: sub.id,
          cancelAtPeriodEnd: true,
          currentPeriodStart: new Date(sub.current_period_start),
          currentPeriodEnd: new Date(sub.current_period_end),
        });
        break;
      }

      case "subscription.revoked": {
        const userId = sub.metadata.userId;
        const existing = userId
          ? undefined
          : await uc.getSubscriptionByPaymentProviderId(sub.id);
        const resolvedUserId = userId ?? existing?.userId;
        if (!resolvedUserId) break;

        await uc.upsertSubscriptionFromPayment({
          userId: resolvedUserId,
          plan: "free",
          status: "cancelled",
          paymentProvider: "polar",
          paymentProviderId: sub.id,
        });
        break;
      }
    }

    return c.json({ received: true }, 200);
  });
}

export const polarWebhookRoute = createPolarWebhookRoute();

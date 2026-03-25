import { Hono } from "hono";

import type { AppContext } from "@backend/context";
import { AppError } from "@backend/error";
import { noopTracer } from "@backend/lib/tracer";
import type { SubscriptionStatus } from "@packages/domain/subscription/subscriptionSchema";

import { newSubscriptionRepository } from "../subscription/subscriptionRepository";
import { newSubscriptionUsecase } from "../subscription/subscriptionUsecase";
import { verifyStripeSignature } from "./stripeSignature";

type StripeWebhookContext = AppContext & {
  Variables: {
    subscriptionUsecase: ReturnType<typeof newSubscriptionUsecase>;
  };
};

const STRIPE_STATUS_MAP: Record<string, SubscriptionStatus> = {
  active: "active",
  past_due: "active",
  trialing: "trial",
  incomplete: "paused",
  paused: "paused",
  canceled: "cancelled",
  unpaid: "expired",
  incomplete_expired: "expired",
};

export function createStripeWebhookRoute() {
  const app = new Hono<StripeWebhookContext>();

  app.use("*", async (c, next) => {
    const db = c.env.DB;
    const tracer = c.get("tracer") ?? noopTracer;
    const repo = newSubscriptionRepository(db);
    const uc = newSubscriptionUsecase(repo, tracer);
    c.set("subscriptionUsecase", uc);
    return next();
  });

  return app.post("/", async (c) => {
    const secret = c.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      throw new AppError("Stripe webhook secret not configured", 500);
    }

    const signatureHeader = c.req.header("stripe-signature");
    if (!signatureHeader) {
      throw new AppError("Missing stripe-signature header", 400);
    }

    const rawBody = await c.req.text();
    const valid = await verifyStripeSignature(rawBody, signatureHeader, secret);
    if (!valid) {
      throw new AppError("Invalid signature", 400);
    }

    const event = JSON.parse(rawBody) as {
      type: string;
      data: { object: Record<string, unknown> };
    };
    const uc = c.var.subscriptionUsecase;

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const metadata = session.metadata as Record<string, string> | undefined;
        const userId = metadata?.userId;
        const subscriptionId = session.subscription as string | undefined;
        if (!userId || !subscriptionId) break;

        await uc.upsertSubscriptionFromPayment({
          userId,
          plan: "premium",
          status: "active",
          paymentProvider: "stripe",
          paymentProviderId: subscriptionId,
        });
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object;
        const providerId = sub.id as string;
        const existing =
          await uc.getSubscriptionByPaymentProviderId(providerId);
        if (!existing) break;

        const stripeStatus = sub.status as string;
        const status = STRIPE_STATUS_MAP[stripeStatus] ?? "expired";

        await uc.upsertSubscriptionFromPayment({
          userId: existing.userId,
          plan:
            status === "expired" || status === "cancelled" ? "free" : "premium",
          status,
          paymentProvider: "stripe",
          paymentProviderId: providerId,
          cancelAtPeriodEnd: (sub.cancel_at_period_end as boolean) ?? false,
          currentPeriodStart: sub.current_period_start
            ? new Date((sub.current_period_start as number) * 1000)
            : undefined,
          currentPeriodEnd: sub.current_period_end
            ? new Date((sub.current_period_end as number) * 1000)
            : undefined,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const providerId = sub.id as string;
        const existing =
          await uc.getSubscriptionByPaymentProviderId(providerId);
        if (!existing) break;

        await uc.upsertSubscriptionFromPayment({
          userId: existing.userId,
          plan: "free",
          status: "cancelled",
          paymentProvider: "stripe",
          paymentProviderId: providerId,
        });
        break;
      }
    }

    return c.json({ received: true }, 200);
  });
}

export const stripeWebhookRoute = createStripeWebhookRoute();

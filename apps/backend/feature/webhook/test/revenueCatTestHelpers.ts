import { Hono } from "hono";

import { vi } from "vitest";

import type { SubscriptionCommandUsecase } from "../../subscription/subscriptionCommandUsecase";
import { createRevenueCatWebhookRoute } from "../revenueCatWebhookRoute";

export const TEST_AUTH_KEY = "test-revenuecat-key";

export function createRevenueCatMockCommandUc(): SubscriptionCommandUsecase {
  return {
    upsertSubscriptionFromPayment: vi.fn(),
  } as unknown as SubscriptionCommandUsecase;
}

export function buildRevenueCatTestApp(commandUc: SubscriptionCommandUsecase) {
  const app = new Hono();

  app.onError((err: Error & { status?: number }, c) => {
    const status = err.status ?? 500;
    return c.json({ message: err.message }, status as 400 | 401 | 500);
  });

  // biome-ignore lint/suspicious/noExplicitAny: test env bindings differ from production AppContext
  app.route("/", createRevenueCatWebhookRoute({ commandUc }) as Hono<any>);

  return app;
}

export function makeRevenueCatEvent(
  type: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    event: {
      type,
      app_user_id: "rc-user-001",
      id: "evt-abc-123",
      original_transaction_id: "txn-xyz-999",
      expiration_at_ms: 1800000000000,
      ...overrides,
    },
  };
}

export async function sendRevenueCatWebhook(
  app: ReturnType<typeof buildRevenueCatTestApp>,
  body: unknown,
  authKey: string = TEST_AUTH_KEY,
) {
  return app.request(
    "/",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authKey}`,
      },
      body: JSON.stringify(body),
    },
    { REVENUECAT_WEBHOOK_AUTH_KEY: TEST_AUTH_KEY },
  );
}

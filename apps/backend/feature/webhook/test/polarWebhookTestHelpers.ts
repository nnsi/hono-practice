import { Hono } from "hono";

import { vi } from "vitest";

import type { SubscriptionCommandUsecase } from "../../subscription/subscriptionCommandUsecase";
import type { SubscriptionQueryUsecase } from "../../subscription/subscriptionUsecase";
import { createPolarWebhookRoute } from "../polarWebhookRoute";

// --- constants ---

const TEST_SECRET_RAW = "dGVzdC1zZWNyZXQtZm9yLXVuaXQtdGVzdHMtMTIzNA==";
export const TEST_SECRET = `whsec_${TEST_SECRET_RAW}`;

// --- crypto ---

export async function signBody(
  msgId: string,
  timestamp: string,
  body: string,
): Promise<string> {
  const raw = TEST_SECRET.slice(6);
  const binary = atob(raw);
  const keyBytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    keyBytes[i] = binary.charCodeAt(i);
  }
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${msgId}.${timestamp}.${body}`),
  );
  const bytes = new Uint8Array(signed);
  let bin = "";
  for (const byte of bytes) {
    bin += String.fromCharCode(byte);
  }
  return btoa(bin);
}

// --- fixtures ---

export function makePolarPayload(
  type: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    type,
    data: {
      id: "polar_sub_001",
      status: "active",
      current_period_start: "2026-03-01T00:00:00Z",
      current_period_end: "2026-04-01T00:00:00Z",
      cancel_at_period_end: false,
      user: { id: "polar_user_1", email: "test@example.com" },
      metadata: { userId: "app-user-123" },
      product: { id: "prod_1", name: "Premium" },
      ...overrides,
    },
  };
}

// --- mock usecases ---

export function createMockCommandUc(): SubscriptionCommandUsecase {
  return {
    upsertSubscriptionFromPayment: vi.fn(),
  } as unknown as SubscriptionCommandUsecase;
}

export function createMockQueryUc(): SubscriptionQueryUsecase {
  return {
    getSubscriptionByPaymentProviderId: vi.fn(),
  } as unknown as SubscriptionQueryUsecase;
}

// --- app builder ---

export function buildTestApp(
  commandUc: SubscriptionCommandUsecase,
  queryUc: SubscriptionQueryUsecase,
) {
  const app = new Hono();

  app.onError((err: Error & { status?: number }, c) => {
    const status = err.status ?? 500;
    return c.json({ message: err.message }, status as 400 | 500);
  });

  // biome-ignore lint/suspicious/noExplicitAny: test env bindings differ from production AppContext
  app.route("/", createPolarWebhookRoute({ commandUc, queryUc }) as Hono<any>);

  return app;
}

export async function sendWebhook(
  app: ReturnType<typeof buildTestApp>,
  body: unknown,
  headers?: Record<string, string>,
) {
  const bodyStr = JSON.stringify(body);
  const msgId = headers?.["webhook-id"] ?? "msg_test1";
  const ts =
    headers?.["webhook-timestamp"] ?? String(Math.floor(Date.now() / 1000));
  const sig =
    headers?.["webhook-signature"] ??
    `v1,${await signBody(msgId, ts, bodyStr)}`;

  return app.request(
    "/",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "webhook-id": msgId,
        "webhook-timestamp": ts,
        "webhook-signature": sig,
        ...headers,
      },
      body: bodyStr,
    },
    { POLAR_WEBHOOK_SECRET: TEST_SECRET },
  );
}

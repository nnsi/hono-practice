import { Hono } from "hono";

import { describe, expect, it, vi } from "vitest";

import { verifyPolarSignature } from "../polarSignature";

// --- helpers ---

const TEST_SECRET_RAW = "dGVzdC1zZWNyZXQtZm9yLXVuaXQtdGVzdHMtMTIzNA==";
const TEST_SECRET = `whsec_${TEST_SECRET_RAW}`;

async function signBody(
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

function makePolarPayload(
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

// -- mock usecase --

function createMockUsecase() {
  return {
    upsertSubscriptionFromPayment: vi.fn(),
    getSubscriptionByPaymentProviderId: vi.fn(),
  };
}

type MockUsecase = ReturnType<typeof createMockUsecase>;

// Build a minimal Hono app that reproduces the route logic with a mock usecase
function buildTestApp(mockUc: MockUsecase) {
  const app = new Hono();

  app.post("/", async (c) => {
    const secret = TEST_SECRET;

    const webhookId = c.req.header("webhook-id");
    const webhookTimestamp = c.req.header("webhook-timestamp");
    const webhookSignature = c.req.header("webhook-signature");

    if (!webhookId || !webhookTimestamp || !webhookSignature) {
      return c.json({ error: "Missing webhook signature headers" }, 400);
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
      return c.json({ error: "Invalid signature" }, 400);
    }

    const payload = JSON.parse(rawBody) as {
      type: string;
      data: {
        id: string;
        status: string;
        current_period_start: string;
        current_period_end: string;
        cancel_at_period_end: boolean;
        metadata: { userId?: string };
      };
    };
    const sub = payload.data;

    switch (payload.type) {
      case "subscription.created": {
        const userId = sub.metadata.userId;
        if (!userId) break;
        await mockUc.upsertSubscriptionFromPayment({
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
          : await mockUc.getSubscriptionByPaymentProviderId(sub.id);
        const resolvedUserId = userId ?? existing?.userId;
        if (!resolvedUserId) break;
        const statusMap: Record<string, string> = {
          active: "active",
          past_due: "active",
          trialing: "trial",
          incomplete: "paused",
          canceled: "cancelled",
          unpaid: "expired",
        };
        const status = statusMap[sub.status] ?? "expired";
        const plan =
          status === "expired" || status === "cancelled" ? "free" : "premium";
        await mockUc.upsertSubscriptionFromPayment({
          userId: resolvedUserId,
          plan,
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
          : await mockUc.getSubscriptionByPaymentProviderId(sub.id);
        const resolvedUserId = userId ?? existing?.userId;
        if (!resolvedUserId) break;
        await mockUc.upsertSubscriptionFromPayment({
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
          : await mockUc.getSubscriptionByPaymentProviderId(sub.id);
        const resolvedUserId = userId ?? existing?.userId;
        if (!resolvedUserId) break;
        await mockUc.upsertSubscriptionFromPayment({
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

  return app;
}

async function sendWebhook(
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

  return app.request("/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "webhook-id": msgId,
      "webhook-timestamp": ts,
      "webhook-signature": sig,
      ...headers,
    },
    body: bodyStr,
  });
}

// --- tests ---

describe("Polar webhook route", () => {
  describe("signature validation", () => {
    it("returns 400 when webhook-id header is missing", async () => {
      const mockUc = createMockUsecase();
      const app = buildTestApp(mockUc);

      const body = JSON.stringify(makePolarPayload("subscription.created"));
      const res = await app.request("/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "webhook-timestamp": String(Math.floor(Date.now() / 1000)),
          "webhook-signature": "v1,dGVzdA==",
        },
        body,
      });

      expect(res.status).toBe(400);
    });

    it("returns 400 when webhook-timestamp header is missing", async () => {
      const mockUc = createMockUsecase();
      const app = buildTestApp(mockUc);

      const body = JSON.stringify(makePolarPayload("subscription.created"));
      const res = await app.request("/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "webhook-id": "msg_1",
          "webhook-signature": "v1,dGVzdA==",
        },
        body,
      });

      expect(res.status).toBe(400);
    });

    it("returns 400 when webhook-signature header is missing", async () => {
      const mockUc = createMockUsecase();
      const app = buildTestApp(mockUc);

      const body = JSON.stringify(makePolarPayload("subscription.created"));
      const res = await app.request("/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "webhook-id": "msg_1",
          "webhook-timestamp": String(Math.floor(Date.now() / 1000)),
        },
        body,
      });

      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid signature", async () => {
      const mockUc = createMockUsecase();
      const app = buildTestApp(mockUc);

      const res = await sendWebhook(
        app,
        makePolarPayload("subscription.created"),
        { "webhook-signature": "v1,aW52YWxpZA==" },
      );

      expect(res.status).toBe(400);
    });
  });

  describe("subscription.created", () => {
    it("calls upsertSubscriptionFromPayment with correct params", async () => {
      const mockUc = createMockUsecase();
      const app = buildTestApp(mockUc);

      const res = await sendWebhook(
        app,
        makePolarPayload("subscription.created"),
      );

      expect(res.status).toBe(200);
      expect(mockUc.upsertSubscriptionFromPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "app-user-123",
          plan: "premium",
          status: "active",
          paymentProvider: "polar",
          paymentProviderId: "polar_sub_001",
        }),
      );
    });

    it("skips if metadata.userId is missing", async () => {
      const mockUc = createMockUsecase();
      const app = buildTestApp(mockUc);

      const payload = makePolarPayload("subscription.created", {
        metadata: {},
      });
      const res = await sendWebhook(app, payload);

      expect(res.status).toBe(200);
      expect(mockUc.upsertSubscriptionFromPayment).not.toHaveBeenCalled();
    });
  });

  describe("subscription.updated", () => {
    it("uses metadata.userId when available", async () => {
      const mockUc = createMockUsecase();
      const app = buildTestApp(mockUc);

      const res = await sendWebhook(
        app,
        makePolarPayload("subscription.updated"),
      );

      expect(res.status).toBe(200);
      expect(mockUc.upsertSubscriptionFromPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "app-user-123",
          paymentProvider: "polar",
          status: "active",
          plan: "premium",
        }),
      );
      expect(mockUc.getSubscriptionByPaymentProviderId).not.toHaveBeenCalled();
    });

    it("falls back to paymentProviderId lookup", async () => {
      const mockUc = createMockUsecase();
      mockUc.getSubscriptionByPaymentProviderId.mockResolvedValue({
        userId: "existing-user-456",
      });
      const app = buildTestApp(mockUc);

      const payload = makePolarPayload("subscription.updated", {
        metadata: {},
      });
      const res = await sendWebhook(app, payload);

      expect(res.status).toBe(200);
      expect(mockUc.getSubscriptionByPaymentProviderId).toHaveBeenCalledWith(
        "polar_sub_001",
      );
      expect(mockUc.upsertSubscriptionFromPayment).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "existing-user-456" }),
      );
    });

    it("maps canceled status to cancelled/free", async () => {
      const mockUc = createMockUsecase();
      const app = buildTestApp(mockUc);

      const payload = makePolarPayload("subscription.updated", {
        status: "canceled",
      });
      const res = await sendWebhook(app, payload);

      expect(res.status).toBe(200);
      expect(mockUc.upsertSubscriptionFromPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "cancelled",
          plan: "free",
        }),
      );
    });
  });

  describe("subscription.active", () => {
    it("handles subscription.active like subscription.updated", async () => {
      const mockUc = createMockUsecase();
      const app = buildTestApp(mockUc);

      const res = await sendWebhook(
        app,
        makePolarPayload("subscription.active"),
      );

      expect(res.status).toBe(200);
      expect(mockUc.upsertSubscriptionFromPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "app-user-123",
          status: "active",
          plan: "premium",
        }),
      );
    });
  });

  describe("subscription.canceled", () => {
    it("sets cancelAtPeriodEnd to true", async () => {
      const mockUc = createMockUsecase();
      const app = buildTestApp(mockUc);

      const res = await sendWebhook(
        app,
        makePolarPayload("subscription.canceled"),
      );

      expect(res.status).toBe(200);
      expect(mockUc.upsertSubscriptionFromPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "app-user-123",
          plan: "premium",
          status: "active",
          cancelAtPeriodEnd: true,
        }),
      );
    });
  });

  describe("subscription.revoked", () => {
    it("sets plan to free and status to cancelled", async () => {
      const mockUc = createMockUsecase();
      const app = buildTestApp(mockUc);

      const res = await sendWebhook(
        app,
        makePolarPayload("subscription.revoked"),
      );

      expect(res.status).toBe(200);
      expect(mockUc.upsertSubscriptionFromPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "app-user-123",
          plan: "free",
          status: "cancelled",
          paymentProvider: "polar",
          paymentProviderId: "polar_sub_001",
        }),
      );
    });

    it("falls back to paymentProviderId lookup when no metadata", async () => {
      const mockUc = createMockUsecase();
      mockUc.getSubscriptionByPaymentProviderId.mockResolvedValue({
        userId: "existing-user-789",
      });
      const app = buildTestApp(mockUc);

      const payload = makePolarPayload("subscription.revoked", {
        metadata: {},
      });
      const res = await sendWebhook(app, payload);

      expect(res.status).toBe(200);
      expect(mockUc.upsertSubscriptionFromPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "existing-user-789",
          plan: "free",
          status: "cancelled",
        }),
      );
    });
  });

  describe("unknown event", () => {
    it("returns 200 without calling usecase", async () => {
      const mockUc = createMockUsecase();
      const app = buildTestApp(mockUc);

      const res = await sendWebhook(app, makePolarPayload("order.created"));

      expect(res.status).toBe(200);
      expect(mockUc.upsertSubscriptionFromPayment).not.toHaveBeenCalled();
    });
  });
});

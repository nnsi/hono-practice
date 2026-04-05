import { describe, expect, it, vi } from "vitest";

import {
  buildTestApp,
  createMockCommandUc,
  createMockQueryUc,
  makePolarPayload,
  sendWebhook,
} from "./polarWebhookTestHelpers";

describe("Polar webhook event handling", () => {
  describe("subscription.created", () => {
    it("calls upsertSubscriptionFromPayment with correct params", async () => {
      const commandUc = createMockCommandUc();
      const app = buildTestApp(commandUc, createMockQueryUc());
      const res = await sendWebhook(
        app,
        makePolarPayload("subscription.created"),
      );

      expect(res.status).toBe(200);
      expect(commandUc.upsertSubscriptionFromPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "app-user-123",
          plan: "premium",
          status: "active",
          paymentProvider: "polar",
          paymentProviderId: "polar_sub_001",
          eventType: "subscription.created",
          webhookId: "msg_test1",
        }),
      );
    });

    it("skips if metadata.userId is missing and fallback lookup returns undefined", async () => {
      const commandUc = createMockCommandUc();
      const queryUc = createMockQueryUc();
      vi.mocked(queryUc.getSubscriptionByPaymentProviderId).mockResolvedValue(
        undefined,
      );
      const app = buildTestApp(commandUc, queryUc);
      const res = await sendWebhook(
        app,
        makePolarPayload("subscription.created", { metadata: {} }),
      );

      expect(res.status).toBe(200);
      expect(queryUc.getSubscriptionByPaymentProviderId).toHaveBeenCalledWith(
        "polar_sub_001",
      );
      expect(commandUc.upsertSubscriptionFromPayment).not.toHaveBeenCalled();
    });

    it("falls back to paymentProviderId lookup when metadata.userId is missing", async () => {
      const commandUc = createMockCommandUc();
      const queryUc = createMockQueryUc();
      vi.mocked(queryUc.getSubscriptionByPaymentProviderId).mockResolvedValue({
        userId: "existing-user-from-polar",
      } as never);
      const app = buildTestApp(commandUc, queryUc);
      const res = await sendWebhook(
        app,
        makePolarPayload("subscription.created", { metadata: {} }),
      );

      expect(res.status).toBe(200);
      expect(commandUc.upsertSubscriptionFromPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "existing-user-from-polar",
          eventType: "subscription.created",
        }),
      );
    });
  });

  describe("subscription.canceled", () => {
    it("sets cancelAtPeriodEnd to true", async () => {
      const commandUc = createMockCommandUc();
      const app = buildTestApp(commandUc, createMockQueryUc());
      const res = await sendWebhook(
        app,
        makePolarPayload("subscription.canceled"),
      );

      expect(res.status).toBe(200);
      expect(commandUc.upsertSubscriptionFromPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "app-user-123",
          plan: "premium",
          status: "active",
          cancelAtPeriodEnd: true,
          eventType: "subscription.canceled",
          webhookId: "msg_test1",
        }),
      );
    });
  });

  describe("subscription.revoked", () => {
    it("sets plan to free and status to cancelled", async () => {
      const commandUc = createMockCommandUc();
      const app = buildTestApp(commandUc, createMockQueryUc());
      const res = await sendWebhook(
        app,
        makePolarPayload("subscription.revoked"),
      );

      expect(res.status).toBe(200);
      expect(commandUc.upsertSubscriptionFromPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "app-user-123",
          plan: "free",
          status: "cancelled",
          paymentProvider: "polar",
          paymentProviderId: "polar_sub_001",
          eventType: "subscription.revoked",
          webhookId: "msg_test1",
        }),
      );
    });

    it("falls back to paymentProviderId lookup when no metadata", async () => {
      const commandUc = createMockCommandUc();
      const queryUc = createMockQueryUc();
      vi.mocked(queryUc.getSubscriptionByPaymentProviderId).mockResolvedValue({
        userId: "existing-user-789",
      } as never);
      const app = buildTestApp(commandUc, queryUc);
      const res = await sendWebhook(
        app,
        makePolarPayload("subscription.revoked", { metadata: {} }),
      );

      expect(res.status).toBe(200);
      expect(commandUc.upsertSubscriptionFromPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "existing-user-789",
          plan: "free",
          status: "cancelled",
          eventType: "subscription.revoked",
        }),
      );
    });
  });

  describe("unknown event", () => {
    it("returns 200 without calling usecase", async () => {
      const commandUc = createMockCommandUc();
      const app = buildTestApp(commandUc, createMockQueryUc());
      const res = await sendWebhook(app, makePolarPayload("order.created"));

      expect(res.status).toBe(200);
      expect(commandUc.upsertSubscriptionFromPayment).not.toHaveBeenCalled();
    });
  });
});

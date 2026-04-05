import { describe, expect, it } from "vitest";

import {
  buildRevenueCatTestApp,
  createRevenueCatMockCommandUc,
  makeRevenueCatEvent,
  sendRevenueCatWebhook,
} from "./revenueCatTestHelpers";

describe("RevenueCat webhook event handling", () => {
  describe("INITIAL_PURCHASE", () => {
    it("calls upsertSubscriptionFromPayment with correct params", async () => {
      const mockUc = createRevenueCatMockCommandUc();
      const app = buildRevenueCatTestApp(mockUc);
      const res = await sendRevenueCatWebhook(
        app,
        makeRevenueCatEvent("INITIAL_PURCHASE"),
      );

      expect(res.status).toBe(200);
      expect(mockUc.upsertSubscriptionFromPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "rc-user-001",
          plan: "premium",
          status: "active",
          paymentProvider: "revenuecat",
          paymentProviderId: "txn-xyz-999",
          eventType: "INITIAL_PURCHASE",
          webhookId: "evt-abc-123",
        }),
      );
    });

    it("uses event.id as paymentProviderId when original_transaction_id is missing", async () => {
      const mockUc = createRevenueCatMockCommandUc();
      const app = buildRevenueCatTestApp(mockUc);
      const res = await sendRevenueCatWebhook(
        app,
        makeRevenueCatEvent("INITIAL_PURCHASE", {
          original_transaction_id: undefined,
        }),
      );

      expect(res.status).toBe(200);
      expect(mockUc.upsertSubscriptionFromPayment).toHaveBeenCalledWith(
        expect.objectContaining({ paymentProviderId: "evt-abc-123" }),
      );
    });

    it("omits currentPeriodEnd when expiration_at_ms is missing", async () => {
      const mockUc = createRevenueCatMockCommandUc();
      const app = buildRevenueCatTestApp(mockUc);
      const res = await sendRevenueCatWebhook(
        app,
        makeRevenueCatEvent("INITIAL_PURCHASE", {
          expiration_at_ms: undefined,
        }),
      );

      expect(res.status).toBe(200);
      expect(mockUc.upsertSubscriptionFromPayment).toHaveBeenCalledWith(
        expect.objectContaining({ currentPeriodEnd: undefined }),
      );
    });
  });

  describe("RENEWAL", () => {
    it("calls upsertSubscriptionFromPayment with correct params", async () => {
      const mockUc = createRevenueCatMockCommandUc();
      const app = buildRevenueCatTestApp(mockUc);
      const res = await sendRevenueCatWebhook(
        app,
        makeRevenueCatEvent("RENEWAL"),
      );

      expect(res.status).toBe(200);
      expect(mockUc.upsertSubscriptionFromPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "rc-user-001",
          plan: "premium",
          status: "active",
          paymentProvider: "revenuecat",
          eventType: "RENEWAL",
        }),
      );
    });
  });

  describe("CANCELLATION", () => {
    it("sets cancelAtPeriodEnd to true and keeps plan premium", async () => {
      const mockUc = createRevenueCatMockCommandUc();
      const app = buildRevenueCatTestApp(mockUc);
      const res = await sendRevenueCatWebhook(
        app,
        makeRevenueCatEvent("CANCELLATION"),
      );

      expect(res.status).toBe(200);
      expect(mockUc.upsertSubscriptionFromPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          plan: "premium",
          status: "active",
          cancelAtPeriodEnd: true,
          eventType: "CANCELLATION",
        }),
      );
    });
  });

  describe("EXPIRATION", () => {
    it("sets plan to free and status to expired", async () => {
      const mockUc = createRevenueCatMockCommandUc();
      const app = buildRevenueCatTestApp(mockUc);
      const res = await sendRevenueCatWebhook(
        app,
        makeRevenueCatEvent("EXPIRATION"),
      );

      expect(res.status).toBe(200);
      expect(mockUc.upsertSubscriptionFromPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          plan: "free",
          status: "expired",
          eventType: "EXPIRATION",
        }),
      );
    });
  });

  describe("Unknown event type", () => {
    it("returns 200 without calling usecase", async () => {
      const mockUc = createRevenueCatMockCommandUc();
      const app = buildRevenueCatTestApp(mockUc);
      const res = await sendRevenueCatWebhook(
        app,
        makeRevenueCatEvent("BILLING_ISSUE"),
      );

      expect(res.status).toBe(200);
      expect(mockUc.upsertSubscriptionFromPayment).not.toHaveBeenCalled();
    });
  });
});

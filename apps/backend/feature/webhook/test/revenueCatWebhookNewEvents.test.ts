import { describe, expect, it } from "vitest";

import {
  buildRevenueCatTestApp,
  createRevenueCatMockCommandUc,
  makeRevenueCatEvent,
  sendRevenueCatWebhook,
} from "./revenueCatTestHelpers";

describe("RevenueCat webhook — new event types (M1)", () => {
  describe("BILLING_ISSUE", () => {
    it("sets plan to free and status to paused", async () => {
      const mockUc = createRevenueCatMockCommandUc();
      const app = buildRevenueCatTestApp(mockUc);
      const res = await sendRevenueCatWebhook(
        app,
        makeRevenueCatEvent("BILLING_ISSUE"),
      );

      expect(res.status).toBe(200);
      expect(mockUc.upsertSubscriptionFromPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "rc-user-001",
          plan: "free",
          status: "paused",
          paymentProvider: "revenuecat",
          paymentProviderId: "txn-xyz-999",
          eventType: "BILLING_ISSUE",
          webhookId: "evt-abc-123",
        }),
      );
    });
  });

  describe("UNCANCELLATION", () => {
    it("sets cancelAtPeriodEnd to false to reverse cancellation", async () => {
      const mockUc = createRevenueCatMockCommandUc();
      const app = buildRevenueCatTestApp(mockUc);
      const res = await sendRevenueCatWebhook(
        app,
        makeRevenueCatEvent("UNCANCELLATION"),
      );

      expect(res.status).toBe(200);
      expect(mockUc.upsertSubscriptionFromPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "rc-user-001",
          plan: "premium",
          status: "active",
          paymentProvider: "revenuecat",
          paymentProviderId: "txn-xyz-999",
          cancelAtPeriodEnd: false,
          eventType: "UNCANCELLATION",
          webhookId: "evt-abc-123",
        }),
      );
    });
  });
});

describe("RevenueCat webhook — anonymous app_user_id guard (M5)", () => {
  it("returns 200 with skipped:anonymous and does not call usecase", async () => {
    const mockUc = createRevenueCatMockCommandUc();
    const app = buildRevenueCatTestApp(mockUc);
    const res = await sendRevenueCatWebhook(
      app,
      makeRevenueCatEvent("INITIAL_PURCHASE", {
        app_user_id: "$RCAnonymousID:abc123def456",
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, skipped: "anonymous" });
    expect(mockUc.upsertSubscriptionFromPayment).not.toHaveBeenCalled();
  });

  it("processes normal user IDs without skipping", async () => {
    const mockUc = createRevenueCatMockCommandUc();
    const app = buildRevenueCatTestApp(mockUc);
    const res = await sendRevenueCatWebhook(
      app,
      makeRevenueCatEvent("INITIAL_PURCHASE", {
        app_user_id: "rc-user-001",
      }),
    );

    expect(res.status).toBe(200);
    expect(mockUc.upsertSubscriptionFromPayment).toHaveBeenCalled();
  });
});

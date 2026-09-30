import { describe, expect, it } from "vitest";

import {
  buildRevenueCatTestApp,
  createRevenueCatMockCommandUc,
  makeRevenueCatEvent,
  sendRevenueCatWebhook,
} from "./revenueCatTestHelpers";

describe("RevenueCat entitlement boundaries", () => {
  it.each([
    undefined,
    null,
    [],
    ["another-product"],
  ])("ignores purchases without premium: %j", async (entitlement_ids) => {
    const uc = createRevenueCatMockCommandUc();
    const response = await sendRevenueCatWebhook(
      buildRevenueCatTestApp(uc),
      makeRevenueCatEvent("INITIAL_PURCHASE", { entitlement_ids }),
    );
    expect(response.status).toBe(200);
    expect(uc.upsertSubscriptionFromPayment).not.toHaveBeenCalled();
  });

  it("preserves access through the billing grace period", async () => {
    const uc = createRevenueCatMockCommandUc();
    const response = await sendRevenueCatWebhook(
      buildRevenueCatTestApp(uc),
      makeRevenueCatEvent("BILLING_ISSUE", {
        expiration_at_ms: 1800000000000,
        grace_period_expiration_at_ms: 1800086400000,
      }),
    );
    expect(response.status).toBe(200);
    expect(uc.upsertSubscriptionFromPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: "premium",
        status: "active",
        currentPeriodEnd: new Date(1800086400000),
      }),
    );
  });

  it("accepts a null grace period without suspending the paid period", async () => {
    const uc = createRevenueCatMockCommandUc();
    const response = await sendRevenueCatWebhook(
      buildRevenueCatTestApp(uc),
      makeRevenueCatEvent("BILLING_ISSUE", {
        grace_period_expiration_at_ms: null,
      }),
    );
    expect(response.status).toBe(200);
    expect(uc.upsertSubscriptionFromPayment).toHaveBeenCalledWith(
      expect.objectContaining({ currentPeriodEnd: new Date(1800000000000) }),
    );
  });

  it.each([
    "SUBSCRIPTION_EXTENDED",
    "REFUND_REVERSED",
  ])("updates the entitlement period for %s", async (type) => {
    const uc = createRevenueCatMockCommandUc();
    await sendRevenueCatWebhook(
      buildRevenueCatTestApp(uc),
      makeRevenueCatEvent(type),
    );
    expect(uc.upsertSubscriptionFromPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: "premium",
        status: "active",
        eventType: type,
      }),
    );
  });

  it("does not treat a refund as a change to the auto-renew preference", async () => {
    const uc = createRevenueCatMockCommandUc();
    await sendRevenueCatWebhook(
      buildRevenueCatTestApp(uc),
      makeRevenueCatEvent("CANCELLATION", {
        cancel_reason: "CUSTOMER_SUPPORT",
      }),
    );
    expect(uc.upsertSubscriptionFromPayment).toHaveBeenCalledWith(
      expect.objectContaining({ cancelAtPeriodEnd: undefined }),
    );
  });
});

it("does not overwrite the grace deadline with a billing-error cancellation", async () => {
  const uc = createRevenueCatMockCommandUc();
  await sendRevenueCatWebhook(
    buildRevenueCatTestApp(uc),
    makeRevenueCatEvent("CANCELLATION", { cancel_reason: "BILLING_ERROR" }),
  );
  expect(uc.upsertSubscriptionFromPayment).not.toHaveBeenCalled();
});

it("reports unsupported transfers for retry and investigation without modifying rights", async () => {
  const uc = createRevenueCatMockCommandUc();
  const response = await sendRevenueCatWebhook(
    buildRevenueCatTestApp(uc),
    makeRevenueCatEvent("TRANSFER", {
      app_user_id: undefined,
      transferred_from: ["user-a"],
      transferred_to: ["user-b"],
    }),
  );
  expect(response.status).toBe(503);
  expect(uc.upsertSubscriptionFromPayment).not.toHaveBeenCalled();
});

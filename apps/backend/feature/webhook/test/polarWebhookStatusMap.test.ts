import { describe, expect, it, vi } from "vitest";

import {
  buildTestApp,
  createMockCommandUc,
  createMockQueryUc,
  makePolarPayload,
  sendWebhook,
} from "./polarWebhookTestHelpers";

describe("Polar webhook POLAR_STATUS_MAP coverage", () => {
  it.each([
    {
      polarStatus: "active",
      expectedStatus: "active",
      expectedPlan: "premium",
    },
    {
      polarStatus: "past_due",
      expectedStatus: "active",
      expectedPlan: "premium",
    },
    {
      polarStatus: "trialing",
      expectedStatus: "trial",
      expectedPlan: "premium",
    },
    {
      polarStatus: "incomplete",
      expectedStatus: "paused",
      expectedPlan: "premium",
    },
    {
      polarStatus: "canceled",
      expectedStatus: "cancelled",
      expectedPlan: "free",
    },
    { polarStatus: "unpaid", expectedStatus: "expired", expectedPlan: "free" },
  ])("maps polar status '$polarStatus' → status=$expectedStatus, plan=$expectedPlan", async ({
    polarStatus,
    expectedStatus,
    expectedPlan,
  }) => {
    const commandUc = createMockCommandUc();
    const app = buildTestApp(commandUc, createMockQueryUc());
    const res = await sendWebhook(
      app,
      makePolarPayload("subscription.updated", { status: polarStatus }),
    );

    expect(res.status).toBe(200);
    expect(commandUc.upsertSubscriptionFromPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        status: expectedStatus,
        plan: expectedPlan,
        eventType: "subscription.updated",
      }),
    );
  });

  it("falls back to expired for unknown polar status", async () => {
    const commandUc = createMockCommandUc();
    const app = buildTestApp(commandUc, createMockQueryUc());
    const res = await sendWebhook(
      app,
      makePolarPayload("subscription.updated", {
        status: "some_future_status",
      }),
    );

    expect(res.status).toBe(200);
    expect(commandUc.upsertSubscriptionFromPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "expired",
        plan: "free",
        eventType: "subscription.updated",
      }),
    );
  });

  it("subscription.active uses same status mapping as subscription.updated", async () => {
    const commandUc = createMockCommandUc();
    const app = buildTestApp(commandUc, createMockQueryUc());
    const res = await sendWebhook(
      app,
      makePolarPayload("subscription.active", { status: "trialing" }),
    );

    expect(res.status).toBe(200);
    expect(commandUc.upsertSubscriptionFromPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "trial",
        plan: "premium",
        eventType: "subscription.active",
      }),
    );
  });

  it("subscription.updated with metadata.userId uses it directly", async () => {
    const commandUc = createMockCommandUc();
    const queryUc = createMockQueryUc();
    const app = buildTestApp(commandUc, queryUc);
    const res = await sendWebhook(
      app,
      makePolarPayload("subscription.updated"),
    );

    expect(res.status).toBe(200);
    expect(commandUc.upsertSubscriptionFromPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "app-user-123",
        eventType: "subscription.updated",
        webhookId: "msg_test1",
      }),
    );
    expect(queryUc.getSubscriptionByPaymentProviderId).not.toHaveBeenCalled();
  });

  it("subscription.updated falls back to paymentProviderId lookup", async () => {
    const commandUc = createMockCommandUc();
    const queryUc = createMockQueryUc();
    vi.mocked(queryUc.getSubscriptionByPaymentProviderId).mockResolvedValue({
      userId: "existing-user-456",
    } as never);
    const app = buildTestApp(commandUc, queryUc);
    const res = await sendWebhook(
      app,
      makePolarPayload("subscription.updated", { metadata: {} }),
    );

    expect(res.status).toBe(200);
    expect(queryUc.getSubscriptionByPaymentProviderId).toHaveBeenCalledWith(
      "polar_sub_001",
    );
    expect(commandUc.upsertSubscriptionFromPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "existing-user-456",
        eventType: "subscription.updated",
      }),
    );
  });
});

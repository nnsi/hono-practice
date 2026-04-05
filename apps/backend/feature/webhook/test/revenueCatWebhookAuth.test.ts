import { describe, expect, it } from "vitest";

import {
  TEST_AUTH_KEY,
  buildRevenueCatTestApp,
  createRevenueCatMockCommandUc,
  makeRevenueCatEvent,
  sendRevenueCatWebhook,
} from "./revenueCatTestHelpers";

describe("RevenueCat webhook authorization", () => {
  it("returns 401 when Authorization header is missing", async () => {
    const app = buildRevenueCatTestApp(createRevenueCatMockCommandUc());
    const res = await app.request(
      "/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(makeRevenueCatEvent("INITIAL_PURCHASE")),
      },
      { REVENUECAT_WEBHOOK_AUTH_KEY: TEST_AUTH_KEY },
    );
    expect(res.status).toBe(401);
  });

  it("returns 401 when Authorization header is wrong", async () => {
    const app = buildRevenueCatTestApp(createRevenueCatMockCommandUc());
    const res = await sendRevenueCatWebhook(
      app,
      makeRevenueCatEvent("INITIAL_PURCHASE"),
      "wrong-key",
    );
    expect(res.status).toBe(401);
  });

  it("returns 500 when auth key is not configured", async () => {
    const app = buildRevenueCatTestApp(createRevenueCatMockCommandUc());
    const res = await app.request(
      "/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TEST_AUTH_KEY}`,
        },
        body: JSON.stringify(makeRevenueCatEvent("INITIAL_PURCHASE")),
      },
      {},
    );
    expect(res.status).toBe(500);
  });

  it("returns 400 when body fails Zod schema validation", async () => {
    const mockUc = createRevenueCatMockCommandUc();
    const app = buildRevenueCatTestApp(mockUc);
    const res = await app.request(
      "/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TEST_AUTH_KEY}`,
        },
        body: JSON.stringify({ event: { type: "INITIAL_PURCHASE" } }),
      },
      { REVENUECAT_WEBHOOK_AUTH_KEY: TEST_AUTH_KEY },
    );
    expect(res.status).toBe(400);
    expect(mockUc.upsertSubscriptionFromPayment).not.toHaveBeenCalled();
  });
});

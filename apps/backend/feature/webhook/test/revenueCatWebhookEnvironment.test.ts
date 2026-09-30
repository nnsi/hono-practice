import { describe, expect, it } from "vitest";

import {
  TEST_AUTH_KEY,
  buildRevenueCatTestApp,
  createRevenueCatMockCommandUc,
  makeRevenueCatEvent,
} from "./revenueCatTestHelpers";

describe("RevenueCat environment isolation", () => {
  it("acknowledges a Dashboard TEST with a null transaction without granting access", async () => {
    const uc = createRevenueCatMockCommandUc();
    const app = buildRevenueCatTestApp(uc);
    const response = await app.request(
      "/",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TEST_AUTH_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          makeRevenueCatEvent("TEST", {
            original_transaction_id: null,
            entitlement_ids: null,
          }),
        ),
      },
      { NODE_ENV: "development", REVENUECAT_WEBHOOK_AUTH_KEY: TEST_AUTH_KEY },
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true, skipped: "test" });
    expect(uc.upsertSubscriptionFromPayment).not.toHaveBeenCalled();
  });

  it.each([
    ["production", "SANDBOX", false],
    ["production", "PRODUCTION", true],
    ["development", "SANDBOX", true],
    ["development", "PRODUCTION", false],
    ["stg", "SANDBOX", true],
    ["stg", "PRODUCTION", false],
    [undefined, "SANDBOX", false],
  ])("%s accepts %s: %s", async (nodeEnv, environment, accepted) => {
    const uc = createRevenueCatMockCommandUc();
    const app = buildRevenueCatTestApp(uc);
    const response = await app.request(
      "/",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TEST_AUTH_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          makeRevenueCatEvent("INITIAL_PURCHASE", { environment }),
        ),
      },
      { NODE_ENV: nodeEnv, REVENUECAT_WEBHOOK_AUTH_KEY: TEST_AUTH_KEY },
    );
    expect(response.status).toBe(200);
    expect(uc.upsertSubscriptionFromPayment).toHaveBeenCalledTimes(
      accepted ? 1 : 0,
    );
    if (!accepted)
      expect(await response.json()).toMatchObject({ skipped: "environment" });
  });

  it.each([
    "INITIAL_PURCHASE",
    "TEST",
  ])("missing environment for %s", async (type) => {
    const uc = createRevenueCatMockCommandUc();
    const app = buildRevenueCatTestApp(uc);
    const response = await app.request(
      "/",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TEST_AUTH_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          makeRevenueCatEvent(type, { environment: undefined }),
        ),
      },
      { NODE_ENV: "production", REVENUECAT_WEBHOOK_AUTH_KEY: TEST_AUTH_KEY },
    );
    expect(response.status).toBe(type === "TEST" ? 200 : 400);
    expect(uc.upsertSubscriptionFromPayment).not.toHaveBeenCalled();
  });
});

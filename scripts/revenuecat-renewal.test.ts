import { randomUUID } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createRevenueCatLocalLab } from "./revenuecat-local";

const password = "local-test-password-only";
const webhookKey = "local-webhook-key-for-test-at-least-32-chars";
let lab: Awaited<ReturnType<typeof createRevenueCatLocalLab>>;
let token: string;
let expiredEnd: number;
let renewedEnd: string;
let provider: string;
async function send(type: string, eventTime: number, end = expiredEnd) {
  return lab.webhookFetch(
    new Request("http://localhost/webhooks/revenuecat", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${webhookKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event: {
          id: randomUUID(),
          type,
          app_user_id: lab.userId,
          original_transaction_id: provider,
          environment: "SANDBOX",
          entitlement_ids: ["premium"],
          event_timestamp_ms: eventTime,
          expiration_at_ms: end,
          cancel_reason: "CUSTOMER_SUPPORT",
        },
      }),
    }),
  );
}
function request(path: string, init: RequestInit = {}) {
  return lab.fetch(
    new Request(`http://localhost${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    }),
  );
}
function customer() {
  return {
    subscriber: {
      original_app_user_id: lab.userId,
      entitlements: {
        premium: {
          product_identifier: "monthly",
          expires_date: renewedEnd,
          grace_period_expires_date: null,
        },
      },
      subscriptions: {
        monthly: {
          expires_date: renewedEnd,
          grace_period_expires_date: null,
          is_sandbox: true,
          refunded_at: null,
          store: "test_store",
        },
      },
    },
  };
}
beforeEach(async () => {
  lab = await createRevenueCatLocalLab({
    password,
    webhookKey,
    revenueCatApiKey: `test_${randomUUID()}`,
  });
  const response = await lab.fetch(
    new Request("http://localhost/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Client-Platform": "ios",
      },
      body: JSON.stringify({ login_id: lab.loginId, password }),
    }),
  );
  token = (await response.json()).token;
  provider = randomUUID();
  expiredEnd = Date.now() + 1000;
  renewedEnd = new Date(Date.now() + 60_000).toISOString();
  expect((await send("INITIAL_PURCHASE", expiredEnd - 60_000)).status).toBe(
    200,
  );
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(expiredEnd + 1000);
});
afterEach(async () => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  await lab?.close();
});

describe("renewal reconciliation through real auth and isolated DB", () => {
  it("keeps API and user plan premium during webhook delay without rewriting stored ordering, then respects refund", async () => {
    const fetcher = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => Response.json(customer()));
    const unauth = await lab.fetch(
      new Request("http://localhost/users/subscription"),
    );
    expect(unauth.status).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
    expect(await (await request("/users/subscription")).json()).toMatchObject({
      plan: "premium",
      canUseApiKey: true,
      currentPeriodEnd: renewedEnd,
    });
    expect(await (await request("/user/me")).json()).toMatchObject({
      plan: "premium",
    });
    const created = await request("/users/api-keys", {
      method: "POST",
      body: JSON.stringify({ name: "renewal-test", scopes: ["all"] }),
    });
    expect(created.status).toBe(201);
    const { apiKey } = await created.json();
    expect(
      (
        await request("/api/v1/tasks", {
          headers: { Authorization: `Bearer ${apiKey.key}` },
        })
      ).status,
    ).toBe(200);
    const rows = await lab.db.query.userSubscriptions.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0].currentPeriodEnd?.getTime()).toBe(expiredEnd);
    expect(fetcher).toHaveBeenCalledOnce();
    // A fresh refund invalidates any cached remote entitlement immediately.
    expect(
      (await send("CANCELLATION", Date.now(), Date.now() - 10)).status,
    ).toBe(200);
    expect(await (await request("/users/subscription")).json()).toMatchObject({
      plan: "free",
      canUseApiKey: false,
    });
    expect((await request("/users/api-keys")).status).toBe(401);
    expect(
      (
        await request("/api/v1/tasks", {
          headers: { Authorization: `Bearer ${apiKey.key}` },
        })
      ).status,
    ).toBe(401);
  });
  it("does not override an expiration delivered while the remote lookup is in flight", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      expect((await send("EXPIRATION", Date.now())).status).toBe(200);
      return Response.json(customer());
    });
    expect(await (await request("/users/subscription")).json()).toMatchObject({
      plan: "free",
      canUseApiKey: false,
    });
  });
  it("keeps expired rights denied when RevenueCat cannot be reached", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    expect(await (await request("/users/subscription")).json()).toMatchObject({
      plan: "free",
      canUseApiKey: false,
    });
    expect((await request("/users/api-keys")).status).toBe(401);
  });
});

import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createRevenueCatLocalLab } from "./revenuecat-local";

const password = "local-test-password-only";
const webhookKey = "local-webhook-key-for-test-at-least-32-chars";
let lab: Awaited<ReturnType<typeof createRevenueCatLocalLab>>;

beforeAll(async () => {
  lab = await createRevenueCatLocalLab({ password, webhookKey });
});
afterAll(async () => {
  await lab?.close();
});

describe("isolated RevenueCat local confirmation path", () => {
  it("uses real login, rejects wrong keys and production events, and persists sandbox lifecycle", async () => {
    const login = await lab.fetch(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Client-Platform": "ios",
        },
        body: JSON.stringify({ login_id: lab.loginId, password }),
      }),
    );
    expect(login.status).toBe(200);
    const { token } = await login.json();
    const getPlan = async () => {
      const response = await lab.fetch(
        new Request("http://localhost/users/subscription", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      );
      expect(response.status).toBe(200);
      return response.json();
    };
    const transactionId = randomUUID();
    const startedAt = Date.now();
    const send = (
      type: string,
      index: number,
      environment = "SANDBOX",
      key = webhookKey,
      overrides: Record<string, unknown> = {},
    ) =>
      lab.webhookFetch(
        new Request("http://localhost/webhooks/revenuecat", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            event: {
              id: `${transactionId}-${index}`,
              type,
              environment,
              entitlement_ids: ["premium"],
              app_user_id: lab.userId,
              original_transaction_id: transactionId,
              event_timestamp_ms: startedAt + index,
              expiration_at_ms: startedAt + 3_600_000,
              ...overrides,
            },
          }),
        }),
      );
    expect((await getPlan()).plan).toBe("free");
    expect((await send("INITIAL_PURCHASE", 1, "SANDBOX", "wrong")).status).toBe(
      401,
    );
    expect(
      await (await send("INITIAL_PURCHASE", 1, "PRODUCTION")).json(),
    ).toMatchObject({ skipped: "environment" });
    expect((await getPlan()).plan).toBe("free");
    expect((await send("INITIAL_PURCHASE", 1)).status).toBe(200);
    expect((await getPlan()).plan).toBe("premium");
    expect((await send("INITIAL_PURCHASE", 1)).status).toBe(200);
    expect((await send("CANCELLATION", 2)).status).toBe(200);
    expect((await getPlan()).plan).toBe("premium");
    expect((await send("EXPIRATION", 3)).status).toBe(200);
    expect((await getPlan()).plan).toBe("free");
    expect((await send("RENEWAL", 0)).status).toBe(200);
    expect((await getPlan()).plan).toBe("free");
    // A paid period may have elapsed while the billing grace period is active.
    expect(
      (
        await send("BILLING_ISSUE", 4, "SANDBOX", webhookKey, {
          expiration_at_ms: startedAt - 1000,
          grace_period_expiration_at_ms: startedAt + 600_000,
        })
      ).status,
    ).toBe(200);
    expect((await getPlan()).plan).toBe("premium");
    expect(
      (
        await send("CANCELLATION", 5, "SANDBOX", webhookKey, {
          expiration_at_ms: startedAt - 1000,
          cancel_reason: "BILLING_ERROR",
        })
      ).status,
    ).toBe(200);
    expect((await getPlan()).plan).toBe("premium");
    expect(
      (
        await send("CANCELLATION", 6, "SANDBOX", webhookKey, {
          expiration_at_ms: 0,
          cancel_reason: "CUSTOMER_SUPPORT",
        })
      ).status,
    ).toBe(200);
    expect((await getPlan()).plan).toBe("free");
    expect((await send("REFUND_REVERSED", 7)).status).toBe(200);
    expect((await getPlan()).plan).toBe("premium");
    expect((await send("EXPIRATION", 8)).status).toBe(200);
    expect((await getPlan()).plan).toBe("free");
    const rows = await lab.db.query.userSubscriptions.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("expired");
  });

  it("never exposes login or other API routes on the tunnel port", async () => {
    for (const path of ["/auth/login", "/user/me", "/", "/webhooks/polar"]) {
      expect(
        (
          await lab.webhookFetch(
            new Request(`http://localhost${path}`, { method: "POST" }),
          )
        ).status,
      ).toBe(404);
    }
    expect(
      (
        await lab.webhookFetch(
          new Request("http://localhost/webhooks/revenuecat"),
        )
      ).status,
    ).toBe(404);
  });
});

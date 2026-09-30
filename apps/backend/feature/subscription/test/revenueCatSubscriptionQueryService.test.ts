import { randomUUID } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import { newRevenueCatSubscriptionQueryService } from "../revenueCatSubscriptionQueryService";

function fixture() {
  const end = new Date(Date.now() + 60_000).toISOString();
  return {
    subscriber: {
      original_app_user_id: "owner",
      entitlements: {
        premium: {
          product_identifier: "monthly",
          expires_date: end,
          grace_period_expires_date: null,
        },
      },
      subscriptions: {
        monthly: {
          expires_date: end,
          grace_period_expires_date: null,
          is_sandbox: true,
          refunded_at: null as string | null,
          store: "test_store",
        },
      },
    },
  };
}
function service(fetcher: typeof fetch, production = false) {
  return newRevenueCatSubscriptionQueryService(
    {
      NODE_ENV: production ? "production" : "development",
      REVENUECAT_API_KEY: randomUUID(),
    },
    fetcher,
  )!;
}

describe("RevenueCat renewal query", () => {
  it("reads confirmed period and shares concurrent requests only within a DB revision", async () => {
    const body = fixture();
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => Response.json(body));
    const query = service(fetcher);
    const [a, b] = await Promise.all([
      query.getRevenueCatPeriodEnd("owner", "1"),
      query.getRevenueCatPeriodEnd("owner", "1"),
    ]);
    expect(a?.toISOString()).toBe(
      body.subscriber.entitlements.premium.expires_date,
    );
    expect(b).toEqual(a);
    expect(fetcher).toHaveBeenCalledOnce();
    await query.getRevenueCatPeriodEnd("owner", "refund-event");
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0][0]).toBe(
      "https://api.revenuecat.com/v1/subscribers/owner",
    );
  });
  it.each([
    "owner",
    "environment",
    "refund",
    "expired",
    "missing",
    "store",
    "malformed",
  ])("fails closed for %s mismatch", async (kind) => {
    const body = fixture();
    if (kind === "owner") body.subscriber.original_app_user_id = "other";
    if (kind === "environment")
      body.subscriber.subscriptions.monthly.is_sandbox = false;
    if (kind === "refund")
      body.subscriber.subscriptions.monthly.refunded_at =
        new Date().toISOString();
    if (kind === "expired")
      body.subscriber.subscriptions.monthly.expires_date = new Date(
        0,
      ).toISOString();
    if (kind === "missing")
      body.subscriber.entitlements.premium.product_identifier = "other";
    if (kind === "store")
      body.subscriber.subscriptions.monthly.store = "promotional";
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(kind === "malformed" ? {} : body));
    expect(
      await service(fetcher).getRevenueCatPeriodEnd("owner", "1"),
    ).toBeUndefined();
  });
  it("rejects sandbox responses in production and accepts real App Store responses", async () => {
    const body = fixture();
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => Response.json(body));
    const query = service(fetcher, true);
    expect(await query.getRevenueCatPeriodEnd("owner", "1")).toBeUndefined();
    body.subscriber.subscriptions.monthly.is_sandbox = false;
    body.subscriber.subscriptions.monthly.store = "app_store";
    expect(await query.getRevenueCatPeriodEnd("owner", "2")).toBeInstanceOf(
      Date,
    );
  });
  it.each(["http", "network"])("fails closed on %s error", async (kind) => {
    const fetcher = vi.fn<typeof fetch>();
    if (kind === "http")
      fetcher.mockResolvedValue(new Response(null, { status: 429 }));
    else fetcher.mockRejectedValue(new Error("timeout"));
    expect(
      await service(fetcher).getRevenueCatPeriodEnd("owner", "1"),
    ).toBeUndefined();
  });
  it("does not enable an unset key or Test Store key in production", () => {
    expect(
      newRevenueCatSubscriptionQueryService({ NODE_ENV: "production" }),
    ).toBeUndefined();
    expect(
      newRevenueCatSubscriptionQueryService({
        NODE_ENV: "production",
        REVENUECAT_API_KEY: "test_example",
      }),
    ).toBeUndefined();
  });
});

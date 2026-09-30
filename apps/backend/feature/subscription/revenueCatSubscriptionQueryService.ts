import type { Config } from "@backend/config";
import { z } from "zod";

const date = z.string().datetime().nullable();
const customerSchema = z.object({
  subscriber: z.object({
    original_app_user_id: z.string(),
    entitlements: z.record(
      z.string(),
      z.object({
        product_identifier: z.string(),
        expires_date: date,
        grace_period_expires_date: date,
      }),
    ),
    subscriptions: z.record(
      z.string(),
      z.object({
        expires_date: date,
        grace_period_expires_date: date,
        is_sandbox: z.boolean(),
        refunded_at: date,
        store: z.string(),
      }),
    ),
  }),
});

export type SubscriptionRenewalQueryService = {
  getRevenueCatPeriodEnd: (
    userId: string,
    revision: string,
  ) => Promise<Date | undefined>;
};

type Options = Pick<Config, "NODE_ENV" | "REVENUECAT_API_KEY">;
// Short, bounded cache: concurrent authenticated requests share a lookup.
// DB revocations are checked separately on every request, including after I/O.
const cache = new Map<
  string,
  { until: number; value: Promise<Date | undefined> }
>();

export function newRevenueCatSubscriptionQueryService(
  options: Options,
  fetcher: typeof fetch = fetch,
): SubscriptionRenewalQueryService | undefined {
  const key = options.REVENUECAT_API_KEY;
  if (!key) return undefined;
  const sandbox = options.NODE_ENV !== "production";
  if (!sandbox && key.startsWith("test_")) return undefined;

  async function lookup(userId: string): Promise<Date | undefined> {
    try {
      const response = await fetcher(
        `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
        {
          headers: { Authorization: `Bearer ${key}` },
          signal: AbortSignal.timeout(2000),
        },
      );
      if (!response.ok) return undefined;
      const parsed = customerSchema.safeParse(await response.json());
      if (!parsed.success) return undefined;
      const customer = parsed.data.subscriber;
      if (customer.original_app_user_id !== userId) return undefined;
      const entitlement = customer.entitlements.premium;
      if (!entitlement) return undefined;
      const subscription =
        customer.subscriptions[entitlement.product_identifier];
      if (
        !subscription ||
        subscription.is_sandbox !== sandbox ||
        subscription.refunded_at
      )
        return undefined;
      const stores = sandbox
        ? ["test_store", "app_store", "play_store"]
        : ["app_store", "play_store"];
      if (!stores.includes(subscription.store)) return undefined;
      const endOf = (item: {
        expires_date: string | null;
        grace_period_expires_date: string | null;
      }) =>
        Math.max(
          ...[item.expires_date, item.grace_period_expires_date].map((value) =>
            value ? Date.parse(value) : 0,
          ),
        );
      const end = Math.min(endOf(entitlement), endOf(subscription));
      return end > Date.now() ? new Date(end) : undefined;
    } catch {
      // External failure never manufactures an entitlement or changes the DB.
      return undefined;
    }
  }

  return {
    getRevenueCatPeriodEnd(userId, revision) {
      const cacheKey = `${key}:${sandbox}:${userId}:${revision}`;
      const previous = cache.get(cacheKey);
      if (previous && previous.until > Date.now()) return previous.value;
      if (cache.size >= 256) cache.clear();
      const value = lookup(userId);
      cache.set(cacheKey, { until: Date.now() + 5000, value });
      return value;
    },
  };
}

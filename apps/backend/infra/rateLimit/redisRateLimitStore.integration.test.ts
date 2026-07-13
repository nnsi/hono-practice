import { createClient } from "redis";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { newRedisRateLimitStore } from "./redisRateLimitStore";

const redisUrl = process.env.REDIS_INTEGRATION_URL;

describe.runIf(Boolean(redisUrl))("Redis rate limit integration", () => {
  const client = createClient({ url: redisUrl });
  const store = newRedisRateLimitStore(client);

  beforeAll(async () => {
    await client.connect();
  });

  afterAll(async () => {
    await client.quit();
  });

  it("keeps a multi-rule batch all-or-nothing when a later rule is full", async () => {
    const partitionKey = `integration:batch:${crypto.randomUUID()}`;
    const broadRule = { key: "broad", limit: 5, windowMs: 60_000 };
    const tightRule = { key: "tight", limit: 1, windowMs: 60_000 };
    const redisKeys = [broadRule, tightRule].map(
      (rule) =>
        `atomic-rate:{${encodeURIComponent(partitionKey)}}:${encodeURIComponent(rule.key)}`,
    );

    try {
      const first = await store.consume({
        partitionKey,
        rules: [broadRule, tightRule],
      });
      const denied = await store.consume({
        partitionKey,
        rules: [broadRule, tightRule],
      });
      const broadOnly = await store.consume({
        partitionKey,
        rules: [broadRule],
      });

      expect(first.allowed).toBe(true);
      expect(denied.allowed).toBe(false);
      expect(denied.states).toMatchObject([{ count: 1 }, { count: 1 }]);
      expect(broadOnly).toMatchObject({
        allowed: true,
        states: [{ key: "broad", count: 2 }],
      });
    } finally {
      await client.del(redisKeys);
    }
  });

  it("executes Lua atomically and preserves lease ownership", async () => {
    const suffix = crypto.randomUUID();
    const partitionKey = `integration:${suffix}`;
    const ruleKey = "minute";
    const concurrencyKey = `integration:${suffix}`;
    const redisKeys = [
      `atomic-rate:{${encodeURIComponent(partitionKey)}}:${encodeURIComponent(ruleKey)}`,
      `atomic-concurrency:${concurrencyKey}`,
    ];

    try {
      const batch = {
        partitionKey,
        rules: [{ key: ruleKey, limit: 3, windowMs: 60_000 }],
      };
      const decisions = await Promise.all(
        Array.from({ length: 12 }, () => store.consume(batch)),
      );
      expect(decisions.filter((decision) => decision.allowed)).toHaveLength(3);
      expect(decisions.filter((decision) => !decision.allowed)).toHaveLength(9);

      const now = Date.now();
      const stale = await store.acquireConcurrency(
        concurrencyKey,
        1,
        1_000,
        now,
      );
      expect(stale.allowed).toBe(true);
      if (!stale.allowed) throw new Error("expected the first lease");

      const current = await store.acquireConcurrency(
        concurrencyKey,
        1,
        1_000,
        now + 1_001,
      );
      expect(current.allowed).toBe(true);
      if (!current.allowed) throw new Error("expected the replacement lease");

      await store.releaseConcurrency(concurrencyKey, stale.leaseId);
      await expect(
        store.acquireConcurrency(concurrencyKey, 1, 1_000, now + 1_002),
      ).resolves.toEqual({ allowed: false, current: 1 });

      await store.releaseConcurrency(concurrencyKey, current.leaseId);
      const afterOwnerRelease = await store.acquireConcurrency(
        concurrencyKey,
        1,
        1_000,
        now + 1_002,
      );
      expect(afterOwnerRelease.allowed).toBe(true);
      if (afterOwnerRelease.allowed) {
        await store.releaseConcurrency(
          concurrencyKey,
          afterOwnerRelease.leaseId,
        );
      }
    } finally {
      await client.del(redisKeys);
    }
  });
});

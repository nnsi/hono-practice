import { describe, expect, it } from "vitest";

import { newMemoryRateLimitStore } from "./memoryRateLimitStore";

describe("memory rate limit store", () => {
  it("isolates the same rule key by explicit partition", async () => {
    const store = newMemoryRateLimitStore();
    const rules = [{ key: "minute", limit: 1, windowMs: 1_000 }];

    await expect(
      store.consume({ partitionKey: "user:a", rules }, 100),
    ).resolves.toMatchObject({ allowed: true });
    await expect(
      store.consume({ partitionKey: "user:a", rules }, 101),
    ).resolves.toMatchObject({ allowed: false });
    await expect(
      store.consume({ partitionKey: "user:b", rules }, 101),
    ).resolves.toMatchObject({ allowed: true });
  });

  it("does not update any rule when one rule is already full", async () => {
    const store = newMemoryRateLimitStore();
    const rules = [
      { key: "broad", limit: 5, windowMs: 1_000 },
      { key: "tight", limit: 1, windowMs: 1_000 },
    ];

    await store.consume({ partitionKey: "user", rules }, 100);
    const denied = await store.consume({ partitionKey: "user", rules }, 200);
    const broadOnly = await store.consume(
      { partitionKey: "user", rules: [rules[0]] },
      200,
    );

    expect(denied).toMatchObject({
      allowed: false,
      states: [
        { key: "broad", count: 1 },
        { key: "tight", count: 1 },
      ],
    });
    expect(broadOnly).toMatchObject({
      allowed: true,
      states: [{ key: "broad", count: 2 }],
    });
  });

  it("waits for every exceeded rule to reset before retrying", async () => {
    const store = newMemoryRateLimitStore();
    const rules = [
      { key: "short", limit: 1, windowMs: 1_000 },
      { key: "long", limit: 1, windowMs: 10_000 },
    ];

    await store.consume({ partitionKey: "retry", rules }, 100);
    await expect(
      store.consume({ partitionKey: "retry", rules }, 200),
    ).resolves.toMatchObject({ allowed: false, retryAfterMs: 9_900 });
  });
});

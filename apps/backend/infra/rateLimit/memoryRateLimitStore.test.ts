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

  it("returns unique lease IDs and only releases the owning lease", async () => {
    const store = newMemoryRateLimitStore();
    const first = await store.acquireConcurrency("user", 2, 1_000, 100);
    const second = await store.acquireConcurrency("user", 2, 1_000, 100);
    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    if (!first.allowed || !second.allowed) {
      throw new Error("expected leases to be acquired");
    }
    expect(first.leaseId).not.toBe(second.leaseId);

    await store.releaseConcurrency("user", "not-the-owner");
    await expect(
      store.acquireConcurrency("user", 2, 1_000, 200),
    ).resolves.toEqual({ allowed: false, current: 2 });

    await store.releaseConcurrency("user", first.leaseId);
    await expect(
      store.acquireConcurrency("user", 2, 1_000, 200),
    ).resolves.toMatchObject({ allowed: true, current: 2 });
  });

  it("expires each lease independently", async () => {
    const store = newMemoryRateLimitStore();
    const first = await store.acquireConcurrency("user", 2, 100, 100);
    const second = await store.acquireConcurrency("user", 2, 100, 150);
    expect(first.allowed && second.allowed).toBe(true);

    await expect(
      store.acquireConcurrency("user", 2, 100, 200),
    ).resolves.toMatchObject({ allowed: true, current: 2 });
  });
});

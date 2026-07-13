import type { AtomicCounterDecision } from "@backend/port/rateLimit";
import { describe, expect, it } from "vitest";

import {
  RateLimitDurableObject,
  type RateLimitDurableObjectState,
  type RateLimitTransaction,
} from "./durableObjectRateLimitStore";

class TransactionalStorage {
  private values = new Map<string, unknown>();
  private queue: Promise<void> = Promise.resolve();

  transaction<T>(
    closure: (transaction: RateLimitTransaction) => Promise<T>,
  ): Promise<T> {
    const operation = this.queue.then(async () => {
      const working = new Map(this.values);
      const transaction: RateLimitTransaction = {
        get: async (key: string): Promise<unknown> => {
          const value = working.get(key);
          return value === undefined ? undefined : structuredClone(value);
        },
        put: async (key, value) => {
          working.set(key, structuredClone(value));
        },
        delete: async (key) => working.delete(key),
      };
      const result = await closure(transaction);
      this.values = working;
      return result;
    });
    this.queue = operation.then(
      () => undefined,
      () => undefined,
    );
    return operation;
  }
}

function object() {
  const storage = new TransactionalStorage();
  const state: RateLimitDurableObjectState = { storage };
  return new RateLimitDurableObject(state);
}

async function post<T>(
  durableObject: RateLimitDurableObject,
  body: object,
): Promise<T> {
  const response = await durableObject.fetch(
    new Request("https://rate-limit.internal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
  expect(response.status).toBe(200);
  return response.json();
}

describe("RateLimitDurableObject", () => {
  it("updates multiple rules all-or-nothing", async () => {
    const durableObject = object();
    const rules = [
      { key: "user:minute", limit: 1, windowMs: 1_000 },
      { key: "user:day", limit: 2, windowMs: 10_000 },
    ];

    const first = await post<AtomicCounterDecision>(durableObject, {
      operation: "consume",
      partitionKey: "user:1",
      rules,
      now: 100,
    });
    const denied = await post<AtomicCounterDecision>(durableObject, {
      operation: "consume",
      partitionKey: "user:1",
      rules,
      now: 200,
    });
    const dayOnly = await post<AtomicCounterDecision>(durableObject, {
      operation: "consume",
      partitionKey: "user:1",
      rules: [rules[1]],
      now: 200,
    });

    expect(first.allowed).toBe(true);
    expect(denied.allowed).toBe(false);
    expect(denied.states[1].count).toBe(1);
    expect(dayOnly).toMatchObject({
      allowed: true,
      states: [{ key: "user:day", count: 2, remaining: 0 }],
    });
  });

  it("starts a fresh counter after the window resets", async () => {
    const durableObject = object();
    const rules = [{ key: "user:minute", limit: 1, windowMs: 1_000 }];

    await post(durableObject, {
      operation: "consume",
      partitionKey: "user:1",
      rules,
      now: 100,
    });
    const denied = await post<AtomicCounterDecision>(durableObject, {
      operation: "consume",
      partitionKey: "user:1",
      rules,
      now: 1_099,
    });
    const reset = await post<AtomicCounterDecision>(durableObject, {
      operation: "consume",
      partitionKey: "user:1",
      rules,
      now: 1_100,
    });

    expect(denied.allowed).toBe(false);
    expect(reset).toMatchObject({
      allowed: true,
      states: [{ count: 1, resetAt: 2_100 }],
    });
  });

  it("isolates equal rule keys in different explicit partitions", async () => {
    const durableObject = object();
    const rules = [{ key: "minute", limit: 1, windowMs: 1_000 }];

    await post(durableObject, {
      operation: "consume",
      partitionKey: "user:a",
      rules,
      now: 100,
    });
    const denied = await post<AtomicCounterDecision>(durableObject, {
      operation: "consume",
      partitionKey: "user:a",
      rules,
      now: 101,
    });
    const otherPartition = await post<AtomicCounterDecision>(durableObject, {
      operation: "consume",
      partitionKey: "user:b",
      rules,
      now: 101,
    });

    expect(denied.allowed).toBe(false);
    expect(otherPartition.allowed).toBe(true);
  });

  it("enforces per-lease TTL and only releases the owning lease", async () => {
    const durableObject = object();
    const acquire = (now: number, leaseId: string) =>
      post<{ allowed: boolean; current: number; leaseId?: string }>(
        durableObject,
        {
          operation: "acquire",
          key: "user-1",
          limit: 1,
          ttlMs: 1_000,
          now,
          leaseId,
        },
      );

    await expect(acquire(100, "lease-a")).resolves.toEqual({
      allowed: true,
      current: 1,
      leaseId: "lease-a",
    });
    await expect(acquire(200, "lease-b")).resolves.toEqual({
      allowed: false,
      current: 1,
    });
    await expect(acquire(1_100, "lease-b")).resolves.toEqual({
      allowed: true,
      current: 1,
      leaseId: "lease-b",
    });
    await post(durableObject, {
      operation: "release",
      key: "user-1",
      leaseId: "not-the-owner",
    });
    await expect(acquire(1_101, "lease-c")).resolves.toEqual({
      allowed: false,
      current: 1,
    });
    await post(durableObject, {
      operation: "release",
      key: "user-1",
      leaseId: "lease-b",
    });
    await expect(acquire(1_102, "lease-c")).resolves.toEqual({
      allowed: true,
      current: 1,
      leaseId: "lease-c",
    });
  });
});

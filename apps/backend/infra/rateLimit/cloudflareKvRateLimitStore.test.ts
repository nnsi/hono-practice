import type { KVNamespace } from "@cloudflare/workers-types";
import { describe, expect, it, vi } from "vitest";

import { newCloudflareKvRateLimitStore as createCloudflareKvRateLimitStore } from "./cloudflareKvRateLimitStore";

type StoredValue = {
  value: string;
  expirationTtl?: number;
};

function deferredTasks() {
  const tasks: Promise<void>[] = [];
  const defer = {
    waitUntil(task: Promise<void>) {
      tasks.push(task);
    },
  };
  return {
    defer,
    async flush() {
      const pending = tasks.splice(0);
      await Promise.all(pending);
    },
  };
}

function fakeNamespace(initial: Record<string, string> = {}) {
  const values = new Map<string, StoredValue>(
    Object.entries(initial).map(([key, value]) => [key, { value }]),
  );
  const get = vi.fn(async (key: string) => values.get(key)?.value ?? null);
  const put = vi.fn(
    async (
      key: string,
      value: string,
      options?: { expirationTtl?: number; metadata?: unknown },
    ) => {
      values.set(key, {
        value,
        expirationTtl: options?.expirationTtl,
      });
    },
  );
  return {
    namespace: { get, put } as unknown as KVNamespace,
    values,
    get,
    put,
  };
}

function parseStored(values: Map<string, StoredValue>, key: string) {
  const stored = values.get(key);
  if (!stored) throw new Error(`missing stored value: ${key}`);
  return JSON.parse(stored.value) as {
    version: number;
    records: Array<{
      key: string;
      count: number;
      windowStart: number;
      expiresAt: number;
    }>;
  };
}

describe("Cloudflare KV rate limit store", () => {
  it("evaluates a multi-rule partition with one get and one deferred put", async () => {
    const kv = fakeNamespace();
    const background = deferredTasks();
    const store = createCloudflareKvRateLimitStore(
      kv.namespace,
      background.defer,
    );

    const decision = await store.consume(
      {
        partitionKey: "ai:quota:user:1",
        rules: [
          { key: "minute", limit: 2, windowMs: 60_000 },
          { key: "day", limit: 10, windowMs: 120_000 },
        ],
      },
      1_000,
    );

    expect(decision).toEqual({
      allowed: true,
      states: [
        {
          key: "minute",
          count: 1,
          remaining: 1,
          resetAt: 61_000,
        },
        { key: "day", count: 1, remaining: 9, resetAt: 121_000 },
      ],
      retryAfterMs: 0,
    });
    expect(kv.get).toHaveBeenCalledOnce();
    expect(kv.get).toHaveBeenCalledWith("ai:quota:user:1");

    await background.flush();
    expect(kv.put).toHaveBeenCalledOnce();
    expect(kv.put).toHaveBeenCalledWith("ai:quota:user:1", expect.any(String), {
      expirationTtl: 120,
    });
    expect(parseStored(kv.values, "ai:quota:user:1")).toEqual({
      version: 1,
      records: [
        { key: "day", count: 1, windowStart: 1_000, expiresAt: 121_000 },
        {
          key: "minute",
          count: 1,
          windowStart: 1_000,
          expiresAt: 61_000,
        },
      ],
    });
  });

  it("does not increment any rule when one rule in the snapshot is full", async () => {
    const partitionKey = "ai:quota:user:full";
    const kv = fakeNamespace({
      [partitionKey]: JSON.stringify({
        version: 1,
        records: [
          { key: "broad", count: 2, windowStart: 100, expiresAt: 10_100 },
          { key: "tight", count: 1, windowStart: 100, expiresAt: 1_100 },
        ],
      }),
    });
    const background = deferredTasks();
    const store = createCloudflareKvRateLimitStore(
      kv.namespace,
      background.defer,
    );

    await expect(
      store.consume(
        {
          partitionKey,
          rules: [
            { key: "broad", limit: 5, windowMs: 10_000 },
            { key: "tight", limit: 1, windowMs: 1_000 },
          ],
        },
        200,
      ),
    ).resolves.toMatchObject({
      allowed: false,
      states: [
        { key: "broad", count: 2 },
        { key: "tight", count: 1 },
      ],
      retryAfterMs: 900,
    });
    expect(kv.put).not.toHaveBeenCalled();
  });

  it("uses the largest reset for TTL and applies the KV minimum TTL", async () => {
    const kv = fakeNamespace();
    const background = deferredTasks();
    const store = createCloudflareKvRateLimitStore(
      kv.namespace,
      background.defer,
    );

    await store.consume(
      {
        partitionKey: "short",
        rules: [{ key: "request", limit: 2, windowMs: 1_000 }],
      },
      100,
    );
    await background.flush();

    expect(kv.values.get("short")?.expirationTtl).toBe(60);
  });

  it("reads and migrates the legacy single-request payload", async () => {
    const kv = fakeNamespace({
      "ratelimit:login:127.0.0.1": JSON.stringify({
        count: 1,
        windowStart: 1_000,
      }),
    });
    const background = deferredTasks();
    const store = createCloudflareKvRateLimitStore(
      kv.namespace,
      background.defer,
    );

    await expect(
      store.consume(
        {
          partitionKey: "ratelimit:login:127.0.0.1",
          rules: [{ key: "request", limit: 3, windowMs: 60_000 }],
        },
        2_000,
      ),
    ).resolves.toMatchObject({
      allowed: true,
      states: [{ key: "request", count: 2, remaining: 1 }],
    });
    await background.flush();

    expect(parseStored(kv.values, "ratelimit:login:127.0.0.1").records).toEqual(
      [
        {
          key: "request",
          count: 2,
          windowStart: 1_000,
          expiresAt: 61_000,
        },
      ],
    );
  });

  it("starts a fresh window when the stored record has expired", async () => {
    const partitionKey = "expired-window";
    const kv = fakeNamespace({
      [partitionKey]: JSON.stringify({
        version: 1,
        records: [
          {
            key: "request",
            count: 5,
            windowStart: 100,
            expiresAt: 1_100,
          },
        ],
      }),
    });
    const background = deferredTasks();
    const store = createCloudflareKvRateLimitStore(
      kv.namespace,
      background.defer,
    );

    await expect(
      store.consume(
        {
          partitionKey,
          rules: [{ key: "request", limit: 5, windowMs: 1_000 }],
        },
        1_101,
      ),
    ).resolves.toEqual({
      allowed: true,
      states: [
        {
          key: "request",
          count: 1,
          remaining: 4,
          resetAt: 2_101,
        },
      ],
      retryAfterMs: 0,
    });
    await background.flush();

    expect(parseStored(kv.values, partitionKey).records).toEqual([
      {
        key: "request",
        count: 1,
        windowStart: 1_101,
        expiresAt: 2_101,
      },
    ]);
  });

  it("rejects a malformed stored document without scheduling a write", async () => {
    const kv = fakeNamespace({ malformed: "not-json" });
    const background = deferredTasks();
    const store = createCloudflareKvRateLimitStore(
      kv.namespace,
      background.defer,
    );

    await expect(
      store.consume({
        partitionKey: "malformed",
        rules: [{ key: "request", limit: 1, windowMs: 60_000 }],
      }),
    ).rejects.toThrow("Invalid Cloudflare KV rate limit document");
    expect(kv.put).not.toHaveBeenCalled();
  });

  it("keeps equal rule keys isolated by partition", async () => {
    const kv = fakeNamespace();
    const background = deferredTasks();
    const store = createCloudflareKvRateLimitStore(
      kv.namespace,
      background.defer,
    );
    const rules = [{ key: "request", limit: 2, windowMs: 60_000 }];

    await store.consume({ partitionKey: "partition:a", rules }, 100);
    await background.flush();
    await store.consume({ partitionKey: "partition:b", rules }, 100);
    await background.flush();
    const secondA = await store.consume(
      { partitionKey: "partition:a", rules },
      101,
    );
    await background.flush();

    expect(secondA.states[0]?.count).toBe(2);
    expect(parseStored(kv.values, "partition:a").records[0]?.count).toBe(2);
    expect(parseStored(kv.values, "partition:b").records[0]?.count).toBe(1);
  });

  it("explicitly allows stale snapshots to over-admit as a soft limit", async () => {
    const kv = fakeNamespace();
    kv.get.mockResolvedValue(null);
    const background = deferredTasks();
    const store = createCloudflareKvRateLimitStore(
      kv.namespace,
      background.defer,
    );
    const batch = {
      partitionKey: "eventually-consistent",
      rules: [{ key: "request", limit: 1, windowMs: 60_000 }],
    };

    const [first, second] = await Promise.all([
      store.consume(batch, 100),
      store.consume(batch, 100),
    ]);
    await background.flush();

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(parseStored(kv.values, batch.partitionKey).records[0]?.count).toBe(
      1,
    );
  });

  it("returns the decision before a deferred write completes", async () => {
    let finishWrite: (() => void) | undefined;
    const kv = fakeNamespace();
    kv.put.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishWrite = resolve;
        }),
    );
    const background = deferredTasks();
    const store = createCloudflareKvRateLimitStore(
      kv.namespace,
      background.defer,
    );

    await expect(
      store.consume(
        {
          partitionKey: "deferred",
          rules: [{ key: "request", limit: 1, windowMs: 60_000 }],
        },
        100,
      ),
    ).resolves.toMatchObject({ allowed: true });

    await vi.waitFor(() => expect(finishWrite).toBeTypeOf("function"));
    finishWrite?.();
    await background.flush();
  });

  it("reports a deferred write failure", async () => {
    const failure = new Error("KV put failed");
    const kv = fakeNamespace();
    kv.put.mockRejectedValueOnce(failure);
    const background = deferredTasks();
    const onBackgroundError = vi.fn();
    const store = createCloudflareKvRateLimitStore(
      kv.namespace,
      background.defer,
      { onBackgroundError },
    );

    await expect(
      store.consume(
        {
          partitionKey: "failed-write",
          rules: [{ key: "request", limit: 1, windowMs: 60_000 }],
        },
        100,
      ),
    ).resolves.toMatchObject({ allowed: true });
    await background.flush();

    expect(onBackgroundError).toHaveBeenCalledOnce();
    expect(onBackgroundError).toHaveBeenCalledWith(failure);
  });

  it("observes a rapid same-key write failure and documents soft over-admission", async () => {
    const partitionKey = "same-key-write-limit";
    const kv = fakeNamespace();
    const firstBackground = deferredTasks();
    const firstStore = createCloudflareKvRateLimitStore(
      kv.namespace,
      firstBackground.defer,
    );
    const batch = {
      partitionKey,
      rules: [{ key: "request", limit: 2, windowMs: 60_000 }],
    };

    await firstStore.consume(batch, 100);
    await firstBackground.flush();

    const writeLimitError = new Error("KV put rate limited");
    kv.put.mockRejectedValueOnce(writeLimitError);
    const failedBackground = deferredTasks();
    const onBackgroundError = vi.fn();
    const secondStore = createCloudflareKvRateLimitStore(
      kv.namespace,
      failedBackground.defer,
      { onBackgroundError },
    );
    await expect(secondStore.consume(batch, 101)).resolves.toMatchObject({
      allowed: true,
      states: [{ count: 2 }],
    });
    await failedBackground.flush();

    const nextBackground = deferredTasks();
    const nextStore = createCloudflareKvRateLimitStore(
      kv.namespace,
      nextBackground.defer,
    );
    await expect(nextStore.consume(batch, 102)).resolves.toMatchObject({
      allowed: true,
      states: [{ count: 2 }],
    });
    await nextBackground.flush();

    expect(onBackgroundError).toHaveBeenCalledWith(writeLimitError);
    expect(parseStored(kv.values, partitionKey).records[0]?.count).toBe(2);
  });

  it("propagates an awaited KV read failure", async () => {
    const kv = fakeNamespace();
    kv.get.mockRejectedValueOnce(new Error("KV get failed"));
    const background = deferredTasks();
    const store = createCloudflareKvRateLimitStore(
      kv.namespace,
      background.defer,
    );

    await expect(
      store.consume({
        partitionKey: "failed-read",
        rules: [{ key: "request", limit: 1, windowMs: 60_000 }],
      }),
    ).rejects.toThrow("KV get failed");
  });
});

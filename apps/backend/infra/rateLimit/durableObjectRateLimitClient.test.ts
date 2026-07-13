import { describe, expect, it, vi } from "vitest";

import {
  type RateLimitDurableObjectNamespace,
  newDurableObjectRateLimitStore,
} from "./durableObjectRateLimitClient";

function jsonResponse(value: unknown): Response {
  return Response.json(value);
}

describe("Durable Object rate limit client", () => {
  it("routes counter batches by partitionKey instead of a rule key", async () => {
    const requestBodies: string[] = [];
    const fetch = vi.fn(async (_input: string, init: { body: string }) => {
      requestBodies.push(init.body);
      return jsonResponse({
        allowed: true,
        states: [{ key: "minute", count: 1, remaining: 1, resetAt: 1_100 }],
        retryAfterMs: 0,
      });
    });
    const getByName = vi.fn(() => ({ fetch }));
    const store = newDurableObjectRateLimitStore({ getByName });

    await store.consume(
      {
        partitionKey: "user:explicit-partition",
        rules: [{ key: "minute", limit: 2, windowMs: 1_000 }],
      },
      100,
    );

    expect(getByName).toHaveBeenCalledWith(
      "rate-limit:user:explicit-partition",
    );
    expect(JSON.parse(requestBodies[0])).toEqual({
      operation: "consume",
      partitionKey: "user:explicit-partition",
      rules: [{ key: "minute", limit: 2, windowMs: 1_000 }],
      now: 100,
    });
  });

  it("sends an owned UUID lease and releases the returned lease", async () => {
    const requests: unknown[] = [];
    const fetch = vi.fn(async (_input: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      requests.push(body);
      if (body.operation === "acquire") {
        return jsonResponse({
          allowed: true,
          current: 1,
          leaseId: body.leaseId,
        });
      }
      return jsonResponse({ released: true });
    });
    const namespace: RateLimitDurableObjectNamespace = {
      getByName: vi.fn(() => ({ fetch })),
    };
    const store = newDurableObjectRateLimitStore(namespace);

    const acquired = await store.acquireConcurrency("user:1", 2, 5_000, 100);
    expect(acquired).toMatchObject({ allowed: true, current: 1 });
    if (!acquired.allowed) throw new Error("expected an acquired lease");
    expect(acquired.leaseId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );

    await store.releaseConcurrency("user:1", acquired.leaseId);

    expect(requests).toEqual([
      {
        operation: "acquire",
        key: "user:1",
        limit: 2,
        ttlMs: 5_000,
        now: 100,
        leaseId: acquired.leaseId,
      },
      {
        operation: "release",
        key: "user:1",
        leaseId: acquired.leaseId,
      },
    ]);
  });

  it("rejects malformed Durable Object responses", async () => {
    const namespace: RateLimitDurableObjectNamespace = {
      getByName: () => ({
        fetch: vi.fn().mockResolvedValue(
          jsonResponse({
            allowed: "yes",
            states: [],
            retryAfterMs: 0,
          }),
        ),
      }),
    };
    const store = newDurableObjectRateLimitStore(namespace);

    await expect(
      store.consume({
        partitionKey: "user:1",
        rules: [{ key: "minute", limit: 1, windowMs: 1_000 }],
      }),
    ).rejects.toThrow();
  });
});

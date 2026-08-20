import type { KVNamespace } from "@cloudflare/workers-types";
import { Miniflare } from "miniflare";
import { afterEach, describe, expect, it } from "vitest";

import { newCloudflareKvRateLimitStore } from "./cloudflareKvRateLimitStore";

describe("Cloudflare KV rate limit store integration", () => {
  let miniflare: Miniflare | undefined;

  afterEach(async () => {
    await miniflare?.dispose();
    miniflare = undefined;
  });

  it("persists versioned partition documents in a real Workers KV runtime", async () => {
    miniflare = new Miniflare({
      compatibilityDate: "2025-01-12",
      modules: true,
      script:
        "export default { fetch() { return new Response('Miniflare ready'); } }",
      kvNamespaces: ["RATE_LIMIT_KV_NS"],
    });
    const namespace = (await miniflare.getKVNamespace(
      "RATE_LIMIT_KV_NS",
    )) as unknown as KVNamespace;
    const backgroundTasks: Promise<void>[] = [];
    const scheduler = {
      waitUntil(task: Promise<void>) {
        backgroundTasks.push(task);
      },
    };
    const store = newCloudflareKvRateLimitStore(namespace, scheduler);

    await expect(
      store.consume(
        {
          partitionKey: "integration:user:1",
          rules: [
            { key: "minute", limit: 2, windowMs: 60_000 },
            { key: "day", limit: 10, windowMs: 120_000 },
          ],
        },
        1_000,
      ),
    ).resolves.toMatchObject({
      allowed: true,
      states: [
        { key: "minute", count: 1 },
        { key: "day", count: 1 },
      ],
    });
    await Promise.all(backgroundTasks);

    const stored = JSON.parse(
      (await namespace.get("integration:user:1")) ?? "null",
    ) as {
      version: number;
      records: Array<{ key: string; count: number }>;
    };
    expect(stored).toEqual({
      version: 1,
      records: [
        expect.objectContaining({ key: "day", count: 1 }),
        expect.objectContaining({ key: "minute", count: 1 }),
      ],
    });
    await expect(namespace.get("integration:user:2")).resolves.toBeNull();
  });
});

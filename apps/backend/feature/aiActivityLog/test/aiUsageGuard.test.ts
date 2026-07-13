import type { HonoContext } from "@backend/context";
import type { RateLimitStore } from "@backend/infra/rateLimit";
import { newMemoryRateLimitStore } from "@backend/infra/rateLimit";
import { noopLogger } from "@backend/lib/logger";
import { createUserId } from "@packages/domain/user/userSchema";
import { describe, expect, it, vi } from "vitest";

import { reserveAIUsage } from "../aiUsageGuard";

const USER_ID = createUserId("00000000-0000-4000-8000-000000000000");

function context(options?: {
  apiKeyId?: string;
  userMinute?: number;
  apiKeyMinute?: number;
  concurrency?: number;
  store?: RateLimitStore;
  nodeEnv?: "test" | "production";
}) {
  const values: Record<string, unknown> = {
    userId: USER_ID,
    apiKeyId: options?.apiKeyId,
    logger: noopLogger,
  };
  return {
    env: {
      NODE_ENV: options?.nodeEnv ?? "test",
      RATE_LIMIT_STORE: options?.store ?? newMemoryRateLimitStore(),
      AI_USER_QUOTA_PER_MINUTE: options?.userMinute ?? 6,
      AI_USER_QUOTA_PER_DAY: 100,
      AI_USER_QUOTA_PER_MONTH: 2000,
      AI_API_KEY_QUOTA_PER_MINUTE: options?.apiKeyMinute ?? 3,
      AI_API_KEY_QUOTA_PER_DAY: 50,
      AI_API_KEY_QUOTA_PER_MONTH: 1000,
      AI_MAX_CONCURRENCY: options?.concurrency ?? 2,
    },
    get(key: string) {
      return values[key];
    },
  } as unknown as HonoContext;
}

describe("AI usage guard", () => {
  it("allows requests up to the user boundary and rejects the next one", async () => {
    const c = context({ userMinute: 2 });
    const first = await reserveAIUsage(c);
    await first.release();
    const second = await reserveAIUsage(c);
    await second.release();

    await expect(reserveAIUsage(c)).rejects.toMatchObject({
      status: 429,
      body: { error: { code: "AI_QUOTA_EXCEEDED" } },
    });
  });

  it("applies API key quota in addition to the user quota", async () => {
    const c = context({
      apiKeyId: "00000000-0000-4000-8000-000000000111",
      userMinute: 10,
      apiKeyMinute: 1,
    });
    const first = await reserveAIUsage(c);
    await first.release();

    await expect(reserveAIUsage(c)).rejects.toMatchObject({
      body: { error: { code: "AI_QUOTA_EXCEEDED" } },
    });
  });

  it("does not admit more than the concurrency limit under parallel calls", async () => {
    const c = context({ concurrency: 2, userMinute: 10 });
    const results = await Promise.allSettled([
      reserveAIUsage(c),
      reserveAIUsage(c),
      reserveAIUsage(c),
    ]);

    const accepted = results.filter(
      (
        result,
      ): result is PromiseFulfilledResult<
        Awaited<ReturnType<typeof reserveAIUsage>>
      > => result.status === "fulfilled",
    );
    const rejected = results.find((result) => result.status === "rejected");
    expect(accepted).toHaveLength(2);
    expect(rejected).toMatchObject({
      status: "rejected",
      reason: {
        status: 429,
        body: { error: { code: "AI_CONCURRENCY_EXCEEDED" } },
      },
    });
    await Promise.all(accepted.map((result) => result.value.release()));
  });

  it("fails closed in production when the quota store is unavailable", async () => {
    const c = context();
    c.env.NODE_ENV = "production";
    c.env.RATE_LIMIT_STORE = undefined;
    await expect(reserveAIUsage(c)).rejects.toMatchObject({
      status: 503,
      body: { error: { code: "AI_QUOTA_UNAVAILABLE" } },
    });
  });

  it("releases exactly once when quota consumption rejects after acquisition", async () => {
    const releaseConcurrency = vi.fn().mockResolvedValue(undefined);
    const store: RateLimitStore = {
      acquireConcurrency: vi
        .fn()
        .mockResolvedValue({ allowed: true, current: 1 }),
      consume: vi.fn().mockRejectedValue(new Error("consume failed")),
      releaseConcurrency,
    };
    const c = context({ store, nodeEnv: "production" });

    await expect(reserveAIUsage(c)).rejects.toMatchObject({
      status: 503,
      body: { error: { code: "AI_QUOTA_UNAVAILABLE" } },
    });

    expect(releaseConcurrency).toHaveBeenCalledOnce();
  });
});

import { newMemoryRateLimitStore } from "@backend/infra/rateLimit";
import { noopLogger } from "@backend/lib/logger";
import type {
  AtomicCounterPort,
  ConcurrencyLeasePort,
} from "@backend/port/rateLimit";
import { createUserId } from "@packages/domain/user/userSchema";
import { describe, expect, it, vi } from "vitest";

import { type AIUsageDependencies, reserveAIUsage } from "../aiUsageGuard";

const USER_ID = createUserId("00000000-0000-4000-8000-000000000000");

function dependencies(options?: {
  apiKeyId?: string;
  userMinute?: number;
  apiKeyMinute?: number;
  concurrency?: number;
  counterStore?: AtomicCounterPort;
  concurrencyStore?: ConcurrencyLeasePort;
  nodeEnv?: "test" | "production";
}): AIUsageDependencies {
  const store = newMemoryRateLimitStore();
  return {
    counterStore: options?.counterStore ?? store,
    concurrencyStore: options?.concurrencyStore ?? store,
    config: {
      nodeEnv: options?.nodeEnv ?? "test",
      userQuotaPerMinute: options?.userMinute ?? 6,
      userQuotaPerDay: 100,
      userQuotaPerMonth: 2000,
      apiKeyQuotaPerMinute: options?.apiKeyMinute ?? 3,
      apiKeyQuotaPerDay: 50,
      apiKeyQuotaPerMonth: 1000,
      maxConcurrency: options?.concurrency ?? 2,
    },
    identity: { userId: USER_ID, apiKeyId: options?.apiKeyId },
    logger: noopLogger,
  };
}

describe("AI usage guard", () => {
  it("allows requests up to the user boundary and rejects the next one", async () => {
    const deps = dependencies({ userMinute: 2 });
    const first = await reserveAIUsage(deps);
    await first.release();
    const second = await reserveAIUsage(deps);
    await second.release();

    await expect(reserveAIUsage(deps)).rejects.toMatchObject({
      status: 429,
      body: { error: { code: "AI_QUOTA_EXCEEDED" } },
    });
  });

  it("applies API key quota in addition to the user quota", async () => {
    const deps = dependencies({
      apiKeyId: "00000000-0000-4000-8000-000000000111",
      userMinute: 10,
      apiKeyMinute: 1,
    });
    const first = await reserveAIUsage(deps);
    await first.release();

    await expect(reserveAIUsage(deps)).rejects.toMatchObject({
      body: { error: { code: "AI_QUOTA_EXCEEDED" } },
    });
  });

  it("does not admit more than the concurrency limit", async () => {
    const deps = dependencies({ concurrency: 2, userMinute: 10 });
    const results = await Promise.allSettled([
      reserveAIUsage(deps),
      reserveAIUsage(deps),
      reserveAIUsage(deps),
    ]);
    const accepted = results.filter(
      (
        result,
      ): result is PromiseFulfilledResult<
        Awaited<ReturnType<typeof reserveAIUsage>>
      > => result.status === "fulfilled",
    );
    expect(accepted).toHaveLength(2);
    expect(
      results.find((result) => result.status === "rejected"),
    ).toMatchObject({
      reason: {
        status: 429,
        body: { error: { code: "AI_CONCURRENCY_EXCEEDED" } },
      },
    });
    await Promise.all(accepted.map((result) => result.value.release()));
  });

  it("fails closed in production when either quota port is unavailable", async () => {
    const deps = dependencies({ nodeEnv: "production" });
    deps.counterStore = undefined;
    await expect(reserveAIUsage(deps)).rejects.toMatchObject({
      status: 503,
      body: { error: { code: "AI_QUOTA_UNAVAILABLE" } },
    });
  });

  it("allows local execution when quota ports are unavailable", async () => {
    const deps = dependencies();
    deps.concurrencyStore = undefined;
    await expect(reserveAIUsage(deps)).resolves.toBeDefined();
  });

  it("releases the acquired lease when counter consumption rejects", async () => {
    const releaseConcurrency = vi.fn().mockResolvedValue(undefined);
    const concurrencyStore: ConcurrencyLeasePort = {
      acquireConcurrency: vi.fn().mockResolvedValue({
        allowed: true,
        current: 1,
        leaseId: "lease-owned",
      }),
      releaseConcurrency,
    };
    const counterStore: AtomicCounterPort = {
      consume: vi.fn().mockRejectedValue(new Error("consume failed")),
    };
    const deps = dependencies({
      counterStore,
      concurrencyStore,
      nodeEnv: "production",
    });

    await expect(reserveAIUsage(deps)).rejects.toMatchObject({
      status: 503,
      body: { error: { code: "AI_QUOTA_UNAVAILABLE" } },
    });
    expect(releaseConcurrency).toHaveBeenCalledOnce();
    expect(releaseConcurrency).toHaveBeenCalledWith(
      `ai:concurrency:user:${USER_ID}`,
      "lease-owned",
    );
  });
});

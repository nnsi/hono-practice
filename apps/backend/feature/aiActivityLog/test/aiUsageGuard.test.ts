import { newMemoryRateLimitStore } from "@backend/infra/rateLimit";
import { noopLogger } from "@backend/lib/logger";
import type { RateLimitCounterPort } from "@backend/port/rateLimit";
import { createUserId } from "@packages/domain/user/userSchema";
import { describe, expect, it, vi } from "vitest";

import { type AIUsageDependencies, consumeAIUsageQuota } from "../aiUsageGuard";

const USER_ID = createUserId("00000000-0000-4000-8000-000000000000");

function dependencies(options?: {
  apiKeyId?: string;
  userMinute?: number;
  apiKeyMinute?: number;
  counterStore?: RateLimitCounterPort;
  nodeEnv?: "test" | "production";
}): AIUsageDependencies {
  const store = newMemoryRateLimitStore();
  return {
    counterStore: options?.counterStore ?? store,
    config: {
      nodeEnv: options?.nodeEnv ?? "test",
      userQuotaPerMinute: options?.userMinute ?? 6,
      userQuotaPerDay: 100,
      userQuotaPerMonth: 2000,
      apiKeyQuotaPerMinute: options?.apiKeyMinute ?? 3,
      apiKeyQuotaPerDay: 50,
      apiKeyQuotaPerMonth: 1000,
    },
    identity: { userId: USER_ID, apiKeyId: options?.apiKeyId },
    logger: noopLogger,
  };
}

describe("AI usage guard", () => {
  it("allows requests up to the user boundary and rejects the next one", async () => {
    const deps = dependencies({ userMinute: 2 });
    await consumeAIUsageQuota(deps);
    await consumeAIUsageQuota(deps);

    await expect(consumeAIUsageQuota(deps)).rejects.toMatchObject({
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
    await consumeAIUsageQuota(deps);

    await expect(consumeAIUsageQuota(deps)).rejects.toMatchObject({
      body: { error: { code: "AI_QUOTA_EXCEEDED" } },
    });
  });

  it("fails closed in production when the quota port is unavailable", async () => {
    const deps = dependencies({ nodeEnv: "production" });
    deps.counterStore = undefined;
    await expect(consumeAIUsageQuota(deps)).rejects.toMatchObject({
      status: 503,
      body: { error: { code: "AI_QUOTA_UNAVAILABLE" } },
    });
  });

  it("allows local execution when quota ports are unavailable", async () => {
    const deps = dependencies();
    deps.counterStore = undefined;
    await expect(consumeAIUsageQuota(deps)).resolves.toBeUndefined();
  });

  it("fails closed in production when counter consumption rejects", async () => {
    const counterStore: RateLimitCounterPort = {
      consume: vi.fn().mockRejectedValue(new Error("consume failed")),
    };
    const deps = dependencies({
      counterStore,
      nodeEnv: "production",
    });

    await expect(consumeAIUsageQuota(deps)).rejects.toMatchObject({
      status: 503,
      body: { error: { code: "AI_QUOTA_UNAVAILABLE" } },
    });
  });
});

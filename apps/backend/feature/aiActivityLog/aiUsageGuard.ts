import { AIQuotaError } from "@backend/error";
import type {
  RateLimitCounterPort,
  RateLimitRule,
} from "@backend/port/rateLimit";

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const MONTH = 30 * DAY;

type ErrorLogger = {
  error(message: string, bindings?: Record<string, unknown>): void;
};

export type AIUsageConfig = {
  nodeEnv: string;
  userQuotaPerMinute: number;
  userQuotaPerDay: number;
  userQuotaPerMonth: number;
  apiKeyQuotaPerMinute: number;
  apiKeyQuotaPerDay: number;
  apiKeyQuotaPerMonth: number;
};

export type AIUsageDependencies = {
  counterStore?: RateLimitCounterPort;
  config: AIUsageConfig;
  identity: { userId: string; apiKeyId?: string };
  logger?: ErrorLogger;
};

function isProductionLike(nodeEnv: string): boolean {
  return nodeEnv === "production" || nodeEnv === "stg";
}

function mapStoreFailure(
  error: unknown,
  dependencies: AIUsageDependencies,
): void {
  if (error instanceof AIQuotaError) throw error;
  dependencies.logger?.error("AI quota store unavailable", {
    error: error instanceof Error ? error.message : String(error),
  });
  if (isProductionLike(dependencies.config.nodeEnv)) {
    throw new AIQuotaError(
      {
        error: {
          code: "AI_QUOTA_UNAVAILABLE",
          message: "AI quota service unavailable",
        },
      },
      503,
    );
  }
}

function quotaRules(dependencies: AIUsageDependencies): RateLimitRule[] {
  const { config, identity } = dependencies;
  const rules: RateLimitRule[] = [
    {
      key: `ai:user:${identity.userId}:minute`,
      limit: config.userQuotaPerMinute,
      windowMs: MINUTE,
    },
    {
      key: `ai:user:${identity.userId}:day`,
      limit: config.userQuotaPerDay,
      windowMs: DAY,
    },
    {
      key: `ai:user:${identity.userId}:month`,
      limit: config.userQuotaPerMonth,
      windowMs: MONTH,
    },
  ];
  if (identity.apiKeyId) {
    rules.push(
      {
        key: `ai:api-key:${identity.apiKeyId}:minute`,
        limit: config.apiKeyQuotaPerMinute,
        windowMs: MINUTE,
      },
      {
        key: `ai:api-key:${identity.apiKeyId}:day`,
        limit: config.apiKeyQuotaPerDay,
        windowMs: DAY,
      },
      {
        key: `ai:api-key:${identity.apiKeyId}:month`,
        limit: config.apiKeyQuotaPerMonth,
        windowMs: MONTH,
      },
    );
  }
  return rules;
}

function unavailable(dependencies: AIUsageDependencies): void {
  mapStoreFailure(new Error("quota ports are not configured"), dependencies);
}

export async function consumeAIUsageQuota(
  dependencies: AIUsageDependencies,
): Promise<void> {
  const { counterStore, config, identity } = dependencies;
  if (!counterStore) {
    if (isProductionLike(config.nodeEnv)) unavailable(dependencies);
    return;
  }

  try {
    const decision = await counterStore.consume({
      partitionKey: `ai:quota:user:${identity.userId}`,
      rules: quotaRules(dependencies),
    });
    if (!decision.allowed) {
      throw new AIQuotaError(
        {
          error: {
            code: "AI_QUOTA_EXCEEDED",
            message: "AI quota exceeded",
            retryAfterSeconds: Math.max(
              1,
              Math.ceil(decision.retryAfterMs / 1000),
            ),
          },
        },
        429,
      );
    }
  } catch (error) {
    mapStoreFailure(error, dependencies);
  }
}

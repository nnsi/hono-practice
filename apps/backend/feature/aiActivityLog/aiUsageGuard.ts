import { AIQuotaError } from "@backend/error";
import type {
  AtomicCounterPort,
  AtomicCounterRule,
  ConcurrencyLeasePort,
} from "@backend/port/rateLimit";

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const MONTH = 30 * DAY;
const CONCURRENCY_LEASE_MS = 5 * MINUTE;

type Reservation = { release(): Promise<void> };
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
  maxConcurrency: number;
};

export type AIUsageDependencies = {
  counterStore?: AtomicCounterPort;
  concurrencyStore?: ConcurrencyLeasePort;
  config: AIUsageConfig;
  identity: { userId: string; apiKeyId?: string };
  logger?: ErrorLogger;
};

function isProductionLike(nodeEnv: string): boolean {
  return nodeEnv === "production" || nodeEnv === "stg";
}

function newReservation(release: () => Promise<void>): Reservation {
  let released = false;
  return {
    release() {
      if (released) return Promise.resolve();
      released = true;
      return release();
    },
  };
}

function releasePreservingError(
  reservation: Reservation,
  error: unknown,
  logger: ErrorLogger | undefined,
): Promise<never> {
  return reservation.release().then(
    () => Promise.reject(error),
    (releaseError) => {
      logger?.error("AI concurrency release failed", {
        error:
          releaseError instanceof Error
            ? releaseError.message
            : String(releaseError),
      });
      return Promise.reject(error);
    },
  );
}

function mapStoreFailure(
  error: unknown,
  dependencies: AIUsageDependencies,
): Reservation {
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
  return { release: () => Promise.resolve() };
}

function quotaRules(dependencies: AIUsageDependencies): AtomicCounterRule[] {
  const { config, identity } = dependencies;
  const rules: AtomicCounterRule[] = [
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

function unavailable(dependencies: AIUsageDependencies): Reservation {
  return mapStoreFailure(
    new Error("quota ports are not configured"),
    dependencies,
  );
}

export async function reserveAIUsage(
  dependencies: AIUsageDependencies,
): Promise<Reservation> {
  const { counterStore, concurrencyStore, config, identity, logger } =
    dependencies;
  if (!counterStore || !concurrencyStore) {
    return isProductionLike(config.nodeEnv)
      ? unavailable(dependencies)
      : { release: () => Promise.resolve() };
  }

  const concurrencyKey = `ai:concurrency:user:${identity.userId}`;
  return concurrencyStore
    .acquireConcurrency(
      concurrencyKey,
      config.maxConcurrency,
      CONCURRENCY_LEASE_MS,
    )
    .then((concurrency) => {
      if (!concurrency.allowed) {
        throw new AIQuotaError(
          {
            error: {
              code: "AI_CONCURRENCY_EXCEEDED",
              message: "Too many concurrent AI requests",
            },
          },
          429,
        );
      }
      const reservation = newReservation(() =>
        concurrencyStore.releaseConcurrency(
          concurrencyKey,
          concurrency.leaseId,
        ),
      );
      return counterStore
        .consume({
          partitionKey: `ai:quota:user:${identity.userId}`,
          rules: quotaRules(dependencies),
        })
        .then(
          (decision) => {
            if (decision.allowed) return reservation;
            const error = new AIQuotaError(
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
            return releasePreservingError(reservation, error, logger);
          },
          (error) => releasePreservingError(reservation, error, logger),
        );
    })
    .catch((error) => mapStoreFailure(error, dependencies));
}

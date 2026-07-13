import type { RateLimitCounterPort } from "@backend/port/rateLimit";
import type { KVNamespace } from "@cloudflare/workers-types";

const DOCUMENT_VERSION = 1;
const MIN_KV_TTL_SECONDS = 60;

type CounterRecord = {
  key: string;
  count: number;
  windowStart: number;
  expiresAt: number;
};

type CounterDocument = {
  version: typeof DOCUMENT_VERSION;
  records: CounterRecord[];
};

type LegacyCounterRecord = {
  count: number;
  windowStart: number;
};

export type CloudflareKvRateLimitStoreOptions = {
  onBackgroundError?: (error: unknown) => void;
};

export type BackgroundTaskScheduler = {
  waitUntil(task: Promise<void>): void;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isCounterRecord(value: unknown): value is CounterRecord {
  return (
    isObject(value) &&
    typeof value.key === "string" &&
    Number.isInteger(value.count) &&
    (value.count as number) >= 0 &&
    isFiniteNumber(value.windowStart) &&
    isFiniteNumber(value.expiresAt)
  );
}

function isLegacyCounterRecord(value: unknown): value is LegacyCounterRecord {
  return (
    isObject(value) &&
    Number.isInteger(value.count) &&
    (value.count as number) >= 0 &&
    isFiniteNumber(value.windowStart)
  );
}

function parseCounterDocument(
  raw: string | null,
  rules: ReadonlyArray<{ key: string; windowMs: number }>,
): CounterRecord[] {
  if (raw === null) return [];

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (error) {
    throw new Error("Invalid Cloudflare KV rate limit document", {
      cause: error,
    });
  }

  if (
    isObject(value) &&
    value.version === DOCUMENT_VERSION &&
    Array.isArray(value.records) &&
    value.records.every(isCounterRecord)
  ) {
    return value.records;
  }

  // 旧KeyValueStore版は一般rate limitをこの単一record形式で保存していた。
  // 同じpartition keyを読み、最初のアクセスでversioned documentへ移行する。
  if (
    isLegacyCounterRecord(value) &&
    rules.length === 1 &&
    rules[0]?.key === "request"
  ) {
    const rule = rules[0];
    return [
      {
        key: rule.key,
        count: value.count,
        windowStart: value.windowStart,
        expiresAt: value.windowStart + rule.windowMs,
      },
    ];
  }

  throw new Error("Invalid Cloudflare KV rate limit document");
}

function expirationTtlSeconds(records: CounterRecord[], now: number): number {
  const maxResetAt = Math.max(...records.map((record) => record.expiresAt));
  return Math.max(MIN_KV_TTL_SECONDS, Math.ceil((maxResetAt - now) / 1_000));
}

/**
 * Workers KV版のsoft rate-limit adapter。
 *
 * 判定に必要なreadだけを待ち、writeはExecutionContext.waitUntil等へ委譲する。
 * KVは結果整合性なので、並列burstの厳密な上限は保証しない。
 */
export function newCloudflareKvRateLimitStore(
  namespace: KVNamespace,
  scheduler: BackgroundTaskScheduler,
  options: CloudflareKvRateLimitStoreOptions = {},
): RateLimitCounterPort {
  let backgroundTail: Promise<void> = Promise.resolve();

  const enqueue = (operation: () => Promise<void>) => {
    const task = backgroundTail.then(operation);
    // 失敗後も同じrequest内の後続writeを実行できるようqueue自体は復旧する。
    backgroundTail = task.catch(() => undefined);
    scheduler.waitUntil(
      options.onBackgroundError
        ? task.catch((error) => {
            options.onBackgroundError?.(error);
          })
        : task,
    );
  };

  return {
    async consume({ partitionKey, rules }, now = Date.now()) {
      if (rules.length === 0) {
        return { allowed: true, states: [], retryAfterMs: 0 };
      }

      const duplicateRule = rules.find(
        (rule, index) =>
          rules.findIndex((candidate) => candidate.key === rule.key) !== index,
      );
      if (duplicateRule) {
        throw new Error(`Duplicate rate limit rule: ${duplicateRule.key}`);
      }

      const storedRecords = parseCounterDocument(
        await namespace.get(partitionKey),
        rules,
      );
      const activeRecords = storedRecords.filter(
        (record) => record.expiresAt > now,
      );
      const byKey = new Map(
        activeRecords.map((record) => [record.key, record]),
      );
      const evaluated = rules.map((rule) => {
        const stored = byKey.get(rule.key);
        const record =
          stored && now - stored.windowStart < rule.windowMs
            ? {
                ...stored,
                expiresAt: stored.windowStart + rule.windowMs,
              }
            : {
                key: rule.key,
                count: 0,
                windowStart: now,
                expiresAt: now + rule.windowMs,
              };
        return { rule, record };
      });
      const exceeded = evaluated.filter(
        ({ rule, record }) => record.count >= rule.limit,
      );
      const allowed = exceeded.length === 0;

      if (allowed) {
        const evaluatedKeys = new Set(rules.map((rule) => rule.key));
        const nextRecords = [
          ...activeRecords.filter((record) => !evaluatedKeys.has(record.key)),
          ...evaluated.map(({ record }) => ({
            ...record,
            count: record.count + 1,
          })),
        ].sort((left, right) => left.key.localeCompare(right.key));
        const document: CounterDocument = {
          version: DOCUMENT_VERSION,
          records: nextRecords,
        };
        const ttl = expirationTtlSeconds(nextRecords, now);
        enqueue(() =>
          namespace.put(partitionKey, JSON.stringify(document), {
            expirationTtl: ttl,
          }),
        );
      }

      return {
        allowed,
        states: evaluated.map(({ rule, record }) => {
          const count = record.count + (allowed ? 1 : 0);
          return {
            key: rule.key,
            count,
            remaining: Math.max(0, rule.limit - count),
            resetAt: record.expiresAt,
          };
        }),
        retryAfterMs:
          exceeded.length === 0
            ? 0
            : Math.max(
                ...exceeded.map(({ record }) => record.expiresAt - now),
                0,
              ),
      };
    },
  };
}

import type {
  AtomicCounterDecision,
  AtomicCounterState,
} from "@backend/port/rateLimit";

import {
  ConcurrencyLeasesSchema,
  CounterSchema,
  DurableRequestSchema,
} from "./durableObjectRateLimitSchemas";

export type RateLimitTransaction = {
  get(key: string): Promise<unknown>;
  put(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<boolean>;
};

export type RateLimitDurableObjectState = {
  storage: {
    transaction<T>(
      closure: (transaction: RateLimitTransaction) => Promise<T>,
    ): Promise<T>;
  };
};

function counterStorageKey(partitionKey: string, ruleKey: string): string {
  return `counter:${JSON.stringify([partitionKey, ruleKey])}`;
}

export class RateLimitDurableObject {
  constructor(private readonly state: RateLimitDurableObjectState) {}

  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") return new Response(null, { status: 405 });
    const body = DurableRequestSchema.parse(await request.json());

    if (body.operation === "consume") {
      const decision = await this.state.storage.transaction(async (tx) => {
        const records = await Promise.all(
          body.rules.map(async (rule) => {
            const storageKey = counterStorageKey(body.partitionKey, rule.key);
            const current = CounterSchema.optional().parse(
              await tx.get(storageKey),
            );
            return {
              storageKey,
              rule,
              record:
                !current || body.now - current.windowStart >= rule.windowMs
                  ? { count: 0, windowStart: body.now }
                  : current,
            };
          }),
        );
        const exceeded = records.find(
          ({ rule, record }) => record.count >= rule.limit,
        );
        const allowed = !exceeded;
        if (allowed) {
          await Promise.all(
            records.map(({ storageKey, record }) =>
              tx.put(storageKey, { ...record, count: record.count + 1 }),
            ),
          );
        }
        const states: AtomicCounterState[] = records.map(({ rule, record }) => {
          const count = record.count + (allowed ? 1 : 0);
          return {
            key: rule.key,
            count,
            remaining: Math.max(0, rule.limit - count),
            resetAt: record.windowStart + rule.windowMs,
          };
        });
        return {
          allowed,
          states,
          retryAfterMs: exceeded
            ? Math.max(
                0,
                exceeded.record.windowStart + exceeded.rule.windowMs - body.now,
              )
            : 0,
        } satisfies AtomicCounterDecision;
      });
      return Response.json(decision);
    }

    if (body.operation === "acquire") {
      const decision = await this.state.storage.transaction(async (tx) => {
        const storageKey = `concurrency:${body.key}`;
        const existing = ConcurrencyLeasesSchema.optional().parse(
          await tx.get(storageKey),
        );
        const active = Object.fromEntries(
          Object.entries(existing ?? {}).filter(
            ([, expiresAt]) => expiresAt > body.now,
          ),
        );
        const current = Object.keys(active).length;
        if (current >= body.limit) {
          await tx.put(storageKey, active);
          return { allowed: false, current };
        }
        if (active[body.leaseId])
          throw new Error("Duplicate concurrency lease");
        active[body.leaseId] = body.now + body.ttlMs;
        await tx.put(storageKey, active);
        return {
          allowed: true,
          current: current + 1,
          leaseId: body.leaseId,
        };
      });
      return Response.json(decision);
    }

    await this.state.storage.transaction(async (tx) => {
      const storageKey = `concurrency:${body.key}`;
      const current = ConcurrencyLeasesSchema.optional().parse(
        await tx.get(storageKey),
      );
      if (!current || !(body.leaseId in current)) return;
      const next = { ...current };
      delete next[body.leaseId];
      if (Object.keys(next).length === 0) await tx.delete(storageKey);
      else await tx.put(storageKey, next);
    });
    return Response.json({ released: true });
  }
}

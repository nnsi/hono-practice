import {
  ConcurrencyCounterSchema,
  CounterSchema,
  DurableRequestSchema,
} from "./durableObjectRateLimitSchemas";
import type { RateLimitDecision, RateLimitState } from "./rateLimitStore";

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

export class RateLimitDurableObject {
  constructor(private readonly state: RateLimitDurableObjectState) {}

  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") return new Response(null, { status: 405 });
    const body = DurableRequestSchema.parse(await request.json());

    if (body.operation === "consume") {
      const decision = await this.state.storage.transaction(async (tx) => {
        const records = await Promise.all(
          body.rules.map(async (rule) => {
            const storageKey = `counter:${rule.key}`;
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
        const states: RateLimitState[] = records.map(({ rule, record }) => {
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
        } satisfies RateLimitDecision;
      });
      return Response.json(decision);
    }

    if (body.operation === "acquire") {
      const decision = await this.state.storage.transaction(async (tx) => {
        const storageKey = `concurrency:${body.key}`;
        const existing = ConcurrencyCounterSchema.optional().parse(
          await tx.get(storageKey),
        );
        const current =
          !existing || existing.expiresAt <= body.now
            ? { count: 0, expiresAt: body.now + body.ttlMs }
            : existing;
        if (current.count >= body.limit) {
          return { allowed: false, current: current.count };
        }
        const next = {
          count: current.count + 1,
          expiresAt: body.now + body.ttlMs,
        };
        await tx.put(storageKey, next);
        return { allowed: true, current: next.count };
      });
      return Response.json(decision);
    }

    await this.state.storage.transaction(async (tx) => {
      const storageKey = `concurrency:${body.key}`;
      const current = ConcurrencyCounterSchema.optional().parse(
        await tx.get(storageKey),
      );
      if (!current || current.count <= 1) await tx.delete(storageKey);
      else await tx.put(storageKey, { ...current, count: current.count - 1 });
    });
    return Response.json({ released: true });
  }
}

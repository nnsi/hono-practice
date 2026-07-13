import { z } from "zod";

export const CounterSchema = z.object({
  count: z.number(),
  windowStart: z.number(),
});

export const ConcurrencyCounterSchema = z.object({
  count: z.number(),
  expiresAt: z.number(),
});

const RateLimitRuleSchema = z.object({
  key: z.string(),
  limit: z.number(),
  windowMs: z.number(),
});

export const DurableRequestSchema = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("consume"),
    rules: z.array(RateLimitRuleSchema),
    now: z.number(),
  }),
  z.object({
    operation: z.literal("acquire"),
    key: z.string(),
    limit: z.number(),
    ttlMs: z.number(),
    now: z.number(),
  }),
  z.object({ operation: z.literal("release"), key: z.string() }),
]);

export type DurableRequest = z.infer<typeof DurableRequestSchema>;

export const RateLimitDecisionSchema = z.object({
  allowed: z.boolean(),
  states: z.array(
    z.object({
      key: z.string(),
      count: z.number(),
      remaining: z.number(),
      resetAt: z.number(),
    }),
  ),
  retryAfterMs: z.number(),
});

export const ConcurrencyDecisionSchema = z.object({
  allowed: z.boolean(),
  current: z.number(),
});

export const ReleaseDecisionSchema = z.object({ released: z.literal(true) });

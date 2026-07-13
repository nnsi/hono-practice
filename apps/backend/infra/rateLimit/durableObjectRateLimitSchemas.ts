import { z } from "zod";

export const CounterSchema = z.object({
  count: z.number(),
  windowStart: z.number(),
});

export const ConcurrencyLeasesSchema = z.record(z.string(), z.number());

const RateLimitRuleSchema = z.object({
  key: z.string(),
  limit: z.number(),
  windowMs: z.number(),
});

export const DurableRequestSchema = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("consume"),
    partitionKey: z.string().min(1),
    rules: z.array(RateLimitRuleSchema),
    now: z.number(),
  }),
  z.object({
    operation: z.literal("acquire"),
    key: z.string(),
    limit: z.number(),
    ttlMs: z.number(),
    now: z.number(),
    leaseId: z.string(),
  }),
  z.object({
    operation: z.literal("release"),
    key: z.string(),
    leaseId: z.string(),
  }),
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

export const ConcurrencyDecisionSchema = z.discriminatedUnion("allowed", [
  z.object({
    allowed: z.literal(true),
    current: z.number(),
    leaseId: z.string(),
  }),
  z.object({ allowed: z.literal(false), current: z.number() }),
]);

export const ReleaseDecisionSchema = z.object({ released: z.literal(true) });

import type { DurableObjectNamespace } from "@cloudflare/workers-types";

import {
  ConcurrencyDecisionSchema,
  type DurableRequest,
  RateLimitDecisionSchema,
  ReleaseDecisionSchema,
} from "./durableObjectRateLimitSchemas";
import type { RateLimitStore } from "./rateLimitStore";

function objectName(key: string): string {
  // All windows for one subject must land on the same strongly-consistent
  // object. Callers put the subject in the first rule/key.
  return `rate-limit:${key}`;
}

function callDurableObject(
  namespace: DurableObjectNamespace,
  routingKey: string,
  body: DurableRequest,
): Promise<unknown> {
  const stub = namespace.getByName(objectName(routingKey));
  return stub
    .fetch("https://rate-limit.internal/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`rate limit durable object failed: ${response.status}`);
      }
      return response.json();
    });
}

export function newDurableObjectRateLimitStore(
  namespace: DurableObjectNamespace,
): RateLimitStore {
  return {
    consume(rules, now = Date.now()) {
      if (rules.length === 0) {
        return Promise.resolve({
          allowed: true,
          states: [],
          retryAfterMs: 0,
        });
      }
      return callDurableObject(namespace, rules[0].key, {
        operation: "consume",
        rules,
        now,
      }).then((value) => RateLimitDecisionSchema.parse(value));
    },
    acquireConcurrency(key, limit, ttlMs, now = Date.now()) {
      return callDurableObject(namespace, key, {
        operation: "acquire",
        key,
        limit,
        ttlMs,
        now,
      }).then((value) => ConcurrencyDecisionSchema.parse(value));
    },
    releaseConcurrency(key) {
      return callDurableObject(namespace, key, {
        operation: "release",
        key,
      }).then((value) => {
        ReleaseDecisionSchema.parse(value);
      });
    },
  };
}

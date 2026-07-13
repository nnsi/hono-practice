import type { RateLimitPorts } from "@backend/port/rateLimit";

import {
  ConcurrencyDecisionSchema,
  type DurableRequest,
  RateLimitDecisionSchema,
  ReleaseDecisionSchema,
} from "./durableObjectRateLimitSchemas";

export type RateLimitDurableObjectNamespace = {
  getByName(name: string): {
    fetch(
      input: string,
      init: {
        method: string;
        headers: Record<string, string>;
        body: string;
      },
    ): Promise<{
      ok: boolean;
      status: number;
      json(): Promise<unknown>;
    }>;
  };
};

function objectName(partitionKey: string): string {
  return `rate-limit:${partitionKey}`;
}

function callDurableObject(
  namespace: RateLimitDurableObjectNamespace,
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
  namespace: RateLimitDurableObjectNamespace,
): RateLimitPorts {
  return {
    consume({ partitionKey, rules }, now = Date.now()) {
      if (rules.length === 0) {
        return Promise.resolve({
          allowed: true,
          states: [],
          retryAfterMs: 0,
        });
      }
      return callDurableObject(namespace, partitionKey, {
        operation: "consume",
        partitionKey,
        rules,
        now,
      }).then((value) => RateLimitDecisionSchema.parse(value));
    },
    acquireConcurrency(key, limit, ttlMs, now = Date.now()) {
      const leaseId = crypto.randomUUID();
      return callDurableObject(namespace, key, {
        operation: "acquire",
        key,
        limit,
        ttlMs,
        now,
        leaseId,
      }).then((value) => ConcurrencyDecisionSchema.parse(value));
    },
    releaseConcurrency(key, leaseId) {
      return callDurableObject(namespace, key, {
        operation: "release",
        key,
        leaseId,
      }).then((value) => {
        ReleaseDecisionSchema.parse(value);
      });
    },
  };
}

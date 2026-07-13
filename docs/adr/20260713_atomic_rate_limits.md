# Atomic rate limits and AI quotas

## Status

Accepted. Supersedes
[`20260215_do_to_kv_ratelimit.md`](./20260215_do_to_kv_ratelimit.md).

## Context

The previous KV decision optimized the measured 500–1,000 ms Durable Object
cold-start cost and accepted eventually consistent counters for a small personal
application. That trade-off stopped being valid when the same boundary began
protecting paid AI usage, per-key quotas, and concurrent OpenRouter calls. A
read-then-write `KeyValueStore` cannot promise that a concurrent burst consumes
one slot exactly once.

## Decision

Cloudflare KV was removed from the request rate-limit path because separate
reads and writes admit concurrent bursts. Cloudflare deployments now use a
Durable Object per subject, where counter decisions run in a storage
transaction. The Node runtime uses one Redis Lua script for the same atomic
decision. Production and staging fail closed when the store is missing or
unavailable.

Application-owned ports define atomic counter consumption and owned concurrency
leases. Infrastructure adapters implement those contracts with Durable Object
transactions, Redis Lua scripts, or an in-memory test implementation. Lease
release requires the ID returned by acquisition so an expired request cannot
release a newer owner's slot.

Each atomic counter batch carries an explicit `partitionKey`. All adapters
identify a counter by the same `(partitionKey, rule.key)` pair; Durable Objects
route by that partition, while Redis uses it as a cluster hash tag. Rule order
or later consumption of a subset therefore cannot split one logical counter
between adapter-specific namespaces.

The same infrastructure enforces AI user/API-key minute, day, and rolling
30-day quotas, plus a two-request user concurrency lease. Durable Object
migration `v3` creates `RateLimitDurableObject`; the `RATE_LIMITER` binding is
declared once in each deployed environment.

## Consequences

- Strict quota correctness is preferred over the lower latency of eventually
  consistent KV counters.
- Durable Object cold starts may reintroduce the previously measured latency.
  WAE latency and denial metrics must be monitored after deployment.
- The old KV namespace is no longer bound to the Worker. Terraform state and
  resource decommissioning remain a separately approved external operation so
  this code change cannot destroy infrastructure.
- A future general-purpose cache may define its own application port and
  consistency contract; it must not reuse the atomic quota port accidentally.

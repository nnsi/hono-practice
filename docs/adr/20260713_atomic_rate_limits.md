# Atomic rate limits and AI quotas

Cloudflare KV was removed from the request rate-limit path because separate
reads and writes admit concurrent bursts. Cloudflare deployments now use a
Durable Object per subject, where counter decisions run in a storage
transaction. The Node runtime uses one Redis Lua script for the same atomic
decision. Production and staging fail closed when the store is missing or
unavailable.

The same store enforces AI user/API-key minute, day, and rolling 30-day quotas,
plus a two-request user concurrency lease. This keeps the request limiter and
OpenRouter cost boundary on one consistency model. Durable Object migration
`v3` creates `RateLimitDurableObject`; the `RATE_LIMITER` binding is declared
once in each deployed environment.

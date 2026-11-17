# Sync state contract

| State | Meaning | Automatic send | Repair transition |
| --- | --- | --- | --- |
| `pending` | Local change has not been acknowledged | yes | — |
| `failed` | Server asked for a retry or could not apply the record yet | yes | successful response → `synced` |
| `rejected` | Record-specific permanent validation/HTTP failure | no | repository retry API → `pending` |
| `synced` | Server acknowledged the local version | no | local edit → `pending` |

HTTP 401 and 403 never reject local data. 408, 409, 425, 429, and 5xx are also
retryable. A 429 is retried once using `Retry-After` (capped at 30 seconds),
then remains pending/failed for a later sync cycle. Permanent chunk failures
are bisected until the invalid record is isolated. The Activity sync API also
returns record-level `failures` with `id`, `code`, `message`, and `retryable`.

`retryRejectedActivities` and `retryRejectedActivityKinds` only transition
records currently in `rejected`; they cannot overwrite newer pending/synced
state. Both Web and Mobile include `pending` and `failed` in automatic sends.

## Push acknowledgement

The server keeps a pushed row only when its `updatedAt` is newer than the stored
one, then raises the stored `updatedAt` to its own clock so other devices can
pull it. Every sync response returns `syncedRevisions` (`id` + stored
`updatedAt`) for the rows it accepted.

- The client clock never issues a timestamp at or before a server `updatedAt`
  it has seen (`trackSyncResultTimestamps`). The `Date` header alone is not
  enough: it has one-second precision and the device clock can be behind.
- `mark*Synced` / `mark*Failed` take the revisions that were sent and only
  touch rows that still have that `updatedAt`. A row edited while the request
  was in flight stays `pending` and gets a fresh `updatedAt`, so the next push
  is newer than the version the server just stored.
- `createSyncEngine` runs each sync function single-flight: a call made while
  one is running triggers one rerun after it finishes instead of a concurrent
  POST of an older snapshot.

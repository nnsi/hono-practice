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

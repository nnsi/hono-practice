# 2026-07 Release Candidate Plan

## Scope

This release candidate hardens the public Web, Admin Web, Backend API, Mobile runtime,
and native Widget implementations before the first store release. The target Mobile
version is `1.1.0`; Expo SDK 55 / app version `1.0.0` binaries must not receive this
runtime.

## Branch and history decision

The comparison recorded before the hardening work was:

- merge base: `0afba36a26c6d2bf1d499bb46059c4c747d530cd`
- `origin/release`-only commits: 169
- `origin/master`-only commits: 37
- `git cherry origin/master origin/release` found no release-only patch that must be
  preserved; the large left-side count is merge-history topology
- a merge-tree of `origin/release` and `origin/master` completed without a content
  conflict

The release content is therefore the current `master` content plus this hardening
change. Integration into `release` uses a normal `master -> release` merge. Do not
reset the release branch or cherry-pick the 37 commits individually.

## Database migrations

The migration set since the shared branch base starts with:

| Migration | Purpose | Compatibility |
|---|---|---|
| `0041_sync_pull_indexes.sql` | Adds pull-path indexes | Additive, safe with old and new clients |
| `0042_fixed_gertrude_yorkes.sql` | Quota, session, subscription ordering, and identity constraints | Additive; generated, applied, and verified locally |

The hardening migration is constrained to additive tables, columns, indexes, and
constraints. It does not rename or drop a field read by an existing API binary.
Uniqueness enforcement includes a precondition query/test so existing duplicate OAuth
identities cannot make deployment fail silently.

## Deployment and compatibility matrix

| Component | Compatible with previous deployed peer | Release condition |
|---|---|---|
| New DB schema | Previous Backend | Yes; additions are expand-compatible |
| New Backend | Previous Web | Yes; sync failure detail is additive and existing response fields remain |
| New Backend | Previous Mobile 1.0.0 | Yes for existing API flows; native hardening is unavailable until 1.1.0 |
| New Admin Web | New Backend | Yes; deploy together because authentication moves to a revocable session |
| Previous Admin Web | New Backend | Not a supported rollback pair; roll Backend and Admin together or forward-fix |
| Mobile 1.1.0 | New Backend | Yes; required for Widget, Keychain, and SDK 57 fixes |
| Mobile 1.1.0 OTA on 1.0.0 binary | No | Blocked by runtime version and workflow native-diff guard |

Deployment order is DB migration, Backend, Web/Admin/Tail artifacts, then the separately
approved Mobile binary. Store rollout uses the same iOS/Android release-candidate commit.

## Rollback and forward-fix policy

- Web, Admin Web, Backend, and Tail Worker retain their preceding Cloudflare versions.
- Backend and Admin authentication roll back as one compatibility unit.
- Additive database migrations stay in place during an application rollback. A
  destructive down migration is not used during an incident.
- A defect in new database-backed behavior is handled by disabling the new code path or
  deploying a forward fix while preserving written data.
- A Mobile native defect stops the store rollout. Native code, entitlement, config
  plugin, or runtime faults require a replacement build; they are not patched by OTA.
- A JS-only Mobile defect may use OTA only when the workflow proves no native-affecting
  file changed since the selected native build SHA.

## Version and tag convention

- Mobile app version and runtime: `1.1.0`
- EAS-managed iOS build number and Android versionCode: recorded with the external build
  evidence; repository code does not invent remote counters
- release candidate tags: `actiko-v1.1.0-rc.1`, `actiko-v1.1.0-rc.2`, ...
- final release tag: `actiko-v1.1.0`

## Local verification evidence

The implementation commit SHA is recorded here after the code commit is created.
External build IDs, deploy run URLs, and credential checks remain in the external
release checklist.

- `pnpm run ci-check`: 229 test files / 2,375 tests, Biome, and all TypeScript projects
  passed. DB-backed PGlite suites run in a dedicated serial project to avoid CI resource
  contention.
- `pnpm run test-e2e`: 20 files / 69 tests passed with per-worker PGlite instances.
- Production builds: Web and Admin Web passed. The largest Web chunks were the 285.18
  kB entry and 428.97 kB vendor chunks; Admin's entry was 283.43 kB.
- Mobile production export with dummy non-secret environment values passed for Web,
  iOS, and Android: 4,262 / 4,669 / 4,767 modules respectively, with 10 MB Hermes
  bundles for both native platforms.
- Native verification: Swift Widget execution tests passed; Android app Kotlin compile,
  Widget unit tests, and Widget release AAR assembly passed. Widget schema v12 was
  checked across React Native, Swift, and Kotlin.
- `expo-doctor@1.20.0`: 20/20 checks passed. `pnpm install --frozen-lockfile` passed.
  `pnpm audit --prod --audit-level=high` reported high 0 and the two accepted moderate
  build-tool findings recorded in `docs/security/mobile-build-tooling-audit-20260713.md`.
- Browser Check 2: offline Note creation synced with HTTP 200 after reconnection,
  appeared in an independent browser, and was deleted cleanly. Free-plan upgrade UI,
  Admin HttpOnly/SameSite=Lax session restore, server-side logout, and authenticated
  zero-console-error contexts were verified.
- Review Cycle: Security, Logic, Architecture, Testability, and Native reviewers all
  returned LGTM after three rounds.

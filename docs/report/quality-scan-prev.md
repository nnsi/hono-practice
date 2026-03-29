# Quality Scan Report
> 2026-03-28

## Summary
- autoFixable: **8** 件
- judgment-required: **51** 件

## AutoFixable
### console.log 残存 (8件)
- `apps/backend/server.node.ts:40` — console.log("REDIS_URL not set, rate limiting disabled");
- `apps/backend/server.node.ts:59` — console.log("Redis connected for rate limiting");
- `apps/backend/server.node.ts:69` — console.log(`Server is running on port ${port} / ${config.NODE_ENV}`);
- `apps/mobile/src/hooks/useOtaUpdate.ts:21` — console.log("[updates] state:", JSON.stringify(updatesState));
- `apps/mobile/src/hooks/useOtaUpdate.ts:27` — console.log("[updates] checkForUpdate:", JSON.stringify(result));
- `apps/mobile/src/hooks/useOtaUpdate.ts:30` — console.log("[updates] fetched:", JSON.stringify(fetchResult));
- `packages/sync-engine/pull/createInitialSync.ts:97` — console.log(
- `packages/sync-engine/pull/createInitialSync.ts:131` — console.log("[sync] hasData:", hasData, {

## Judgment Required
### 200行超ファイル (38件)
- `apps/mobile/src/repositories/activityRepository.ts` — 603 lines
- `apps/mobile/src/components/csv/CSVImportModal.tsx` — 523 lines
- `apps/frontend/src/hooks/useCSVImport.ts` — 495 lines
- `apps/backend/feature/activity/activityRepository.ts` — 449 lines
- `apps/backend/feature/auth/authUsecase.ts` — 448 lines
- `apps/frontend/src/components/csv/CSVImportPreview.tsx` — 407 lines
- `apps/backend/feature/activity/activityUsecase.ts` — 338 lines
- `apps/mobile/src/components/tasks/TasksPage.tsx` — 336 lines
- `apps/backend/feature/activityLog/activityLogUsecase.ts` — 333 lines
- `apps/backend/feature/task/taskRepository.ts` — 329 lines
- `apps/frontend/src/components/tasks/TasksPage.tsx` — 315 lines
- `apps/mobile/src/components/stats/ActivityChart.tsx` — 306 lines
- `apps/frontend/src/components/stats/ActivityChart.tsx` — 304 lines
- `apps/backend/feature/goal/goalUsecase.ts` — 293 lines
- `packages/frontend-shared/repositories/activityRepositoryLogic.ts` — 289 lines
- `apps/backend/feature/activityLog/activityLogRepository.ts` — 283 lines
- `apps/frontend/src/components/tasks/TaskEditDialog.tsx` — 262 lines
- `apps/frontend/src/components/csv/CSVColumnMapper.tsx` — 258 lines
- `apps/frontend/src/components/goal/EditGoalForm.tsx` — 252 lines
- `apps/backend/feature/activitygoal/activityGoalRepository.ts` — 238 lines
- `apps/frontend/src/components/tasks/TaskCreateDialog.tsx` — 236 lines
- `packages/sync-engine/pull/createInitialSync.ts` — 235 lines
- `apps/mobile/src/components/goal/FreezePeriodManager.tsx` — 234 lines
- `packages/domain/csv/csvParser.ts` — 234 lines
- `apps/backend/middleware/rateLimitMiddleware.ts` — 224 lines
- `apps/frontend/src/components/goal/FreezePeriodManager.tsx` — 223 lines
- `apps/mobile/src/components/tasks/TaskEditDialog.tsx` — 219 lines
- `apps/mobile/src/components/actiko/EditActivityDialog.tsx` — 218 lines
- `apps/frontend/src/db/activityRepository.ts` — 215 lines
- `apps/backend/feature/activitygoal/activityGoalService.ts` — 214 lines
- ...他 8 件

### `as unknown as` 使用 (5件)
- `apps/backend/feature/webhook/polarSignature.ts:49` — secretBytes as unknown as ArrayBuffer,
- `apps/mobile/src/db/expo-sqlite-web-shim.ts:33` — globalThis as unknown as {
- `apps/mobile/src/components/recording-modes/modes/CounterMode.tsx:142` — const node = quantityRef.current as unknown as {
- `apps/mobile/src/components/recording-modes/modes/ManualMode.tsx:42` — const node = quantityRef.current as unknown as {
- `apps/mobile/src/components/recording-modes/modes/TimerMode.tsx:171` — const node = quantityRef.current as unknown as {

### 陳腐化ドキュメント参照 (8件)
- `docs/knowledges/frontend.md` — 存在しない参照: src/db/schema.ts
- `docs/knowledges/frontend.md` — 存在しない参照: src/utils/apiClient.ts
- `docs/adr/20260215_do_to_kv_ratelimit.md` — 存在しない参照: infra/do/kvs.ts
- `docs/adr/20260215_do_to_kv_ratelimit.md` — 存在しない参照: apps/backend/infra/kv/do.ts
- `docs/adr/20260225_domain_logic_to_packages.md` — 存在しない参照: packages/domain/task/taskEntity.ts
- `docs/adr/20260315_remove_v2_naming.md` — 存在しない参照: apps/frontend-v2/package.json
- `docs/adr/20260315_remove_v2_naming.md` — 存在しない参照: apps/frontend-v2/CLAUDE.md
- `docs/adr/20260315_sync_engine_consolidation.md` — 存在しない参照: apps/frontend/src/sync/index.ts

## Info
### Instruction Surface
- `CLAUDE.md` — 60 lines / 27 bullets
- `apps/backend/CLAUDE.md` — 23 lines / 12 bullets
- `apps/frontend/CLAUDE.md` — 24 lines / 10 bullets
- `apps/mobile/CLAUDE.md` — 12 lines / 5 bullets
- `.claude/rules/parallel-agents.md` — 71 lines / 32 bullets
- `.claude/rules/response-style.md` — 12 lines / 3 bullets
- `**合計**` — 202 lines / 89 bullets

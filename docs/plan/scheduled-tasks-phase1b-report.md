# Scheduled Tasks Phase 1b 実装報告（2026-09-10）

Codex に委譲したが、実行環境のメモリ不足で 2 回強制終了された（Codex が起動する vitest がトリガー）。途中成果を Fable（メイン）が引き取り完成させた。

## 実装内容（Codex の途中成果 + メインの仕上げ）

- sync-engine: `mapApiTaskSchedule`（zod で recurrence を検証）、`createSyncTaskSchedules`、v2 sync functions / initial sync / parseResponses / bootstrappedResources（`taskSchedules`）への組み込み
- Web: Dexie version 9（`taskSchedules` テーブル、`tasks` に `[scheduleId+scheduledDate]` index）、`db/taskScheduleRepository.ts`（共有ロジック `packages/frontend-shared/repositories/taskScheduleRepositoryLogic.ts`）、`api/taskScheduleSyncApi.ts`、syncEngine / initialSync 配線
- Mobile: SCHEMA_VERSION 13（`task_schedules` テーブル、`tasks` に `schedule_id` / `scheduled_date` + index）、`repositories/taskScheduleRepository.ts`（同じ共有ロジック）、`api/taskScheduleSyncApi.ts`、syncEngine / initialSync / clearAllTables 配線
- Web/Mobile 非対称チェック: 両者とも同一の `TaskScheduleDbAdapter` を実装し `newTaskScheduleRepository` を使う。API 関数名・sync 配線も同名。非対称なし

## メインが行った修正

- 前セッションが 200 行ルールのために既存テストを分割していた変更を元に戻した（2 回目の Codex が大半を復元済み）
- 無関係な整形差分（`apps/backend/lib/clientDate.test.ts`, `scripts/release-workflow.test.ts`）を revert、サンドボックスが残した `.pnpm-store/` を削除
- 書きかけの `initialSyncSchedules.test.ts`（Web/Mobile）と専用 helper 3 本を削除。理由: Mobile 側は vi.mock の hoist が効かず実モジュールを読み込んで `__DEV__` 未定義で落ち、Web 側は zod 検証を通らないフィクスチャだった。pull の watermark / 失敗時の挙動は `packages/sync-engine/pull/taskSchedulesPull*.test.ts` で既にカバーされている
- 代わりに既存の `initialSync.test.ts`（Web/Mobile）へ「task-schedules API の結果が `upsertTaskSchedulesFromServer` に渡る」assertion を追加
- Mobile `rowMappers.test.ts` の期待値に `scheduleId` / `scheduledDate` を追加、`initialSync.test.ts` のモック型を既存パターンに合わせた

## 検証（メインが実行）

| コマンド | 結果 |
|---|---|
| `pnpm run fix` | 差分なし |
| `pnpm exec vitest run --maxWorkers=3`（= test-once） | 275 files passed, 2648 tests passed, 2 skipped |
| `pnpm run tsc` | エラー 0（admin-frontend, mobile 含む） |

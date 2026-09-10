Scheduled Tasks Phase 1a 実装報告（2026-09-10）

実装範囲は domain・DB・backend CRUD・backend sync・API 型。フロント、sync-engine、mobile の実装ファイルは変更していない。
実装と新規テストの検証は完了。検収条件のうち `pnpm run test-once` 全パスのみ、実行環境の制限により未達。

**実装内容**

- `task_schedule` テーブル、Task の nullable `schedule_id` / `scheduled_date`、指定の index / FK を追加。
- branded ID、new / persisted entity、interval / weekdays の discriminated union、実在日・日付範囲・曜日重複を検証。
- `GET /users/task-schedules`、`POST /users/task-schedules`、`PUT /users/task-schedules/:id`、`DELETE /users/task-schedules/:id` を追加。
- `GET /users/v2/task-schedules`、`POST /users/v2/task-schedules/sync` を追加。LWW、serverWins、skippedIds、時計ずれ補正、厳密な `updated_at > since` を実装。
- Task の CRUD・sync・アーカイブ・旧差分取得経路で追加フィールドを保持。
- 新規 Hono/PGlite 統合テストと domain unit test を追加。CRUD / sync の soft delete 後も完了済み Task が残ることを検証。

**実行コマンドと結果**

| コマンド | 結果 |
| --- | --- |
| `node scripts/generate-domain.js taskSchedule` | 成功。生成器の小文字化を補正して taskSchedule ディレクトリへ配置 |
| `node scripts/generate-feature.js taskSchedule` | 成功。生成されたひな形を本仕様に合わせて実装 |
| `pnpm run db-generate` | 成功。`infra/drizzle/migrations/0043_hot_firedrake.sql` と snapshot / journal を生成 |
| `pnpm run test-once` | 252 ファイル成功・1 ファイル失敗・1 ファイル skip。2,555 テスト成功・1 テスト失敗・2 テスト skip。終了コード 1 |
| `pnpm run tsc` | 成功、終了コード 0。root・admin frontend・mobile の型チェックでエラー 0 |
| `pnpm run fix` | 成功、1,481 ファイルを確認。今回の変更と無関係な 2 ファイルの整形差分は復元 |
| 下記の新規テスト対象実行 | 修正・整形後に 7 ファイル・45 テストすべて成功、終了コード 0 |
| `pnpm run guard:backend` | 成功 |
| `pnpm run guard:dates` | 成功 |
| `git diff --check` | 成功 |

新規テスト対象実行のコマンド:

```sh
pnpm exec vitest run packages/domain/taskSchedule apps/backend/feature/taskSchedule apps/backend/feature/task/test/taskScheduleLinkRoute.test.ts apps/backend/feature-sync/task-schedule apps/backend/feature-sync/task/taskScheduleLinkSyncRoute.test.ts
```

全体テストで失敗したのは `apps/backend/infra/rateLimit/cloudflareKvRateLimitStore.integration.test.ts` の Workers KV 実ランタイム統合テスト。
Miniflare 起動時に `listen EPERM: operation not permitted 127.0.0.1` が発生し、テストと cleanup hook がそれぞれ 30 秒で timeout した。
独立した Node の loopback listen 確認でも同じ EPERM を確認。このセッションは権限昇格不可のため、当該テストを正常実行できない。
テストの除外・skip 追加・期待値の弱化は行っていない。

migration は PGlite テスト内で適用し、実 FK を含む CRUD と保存データを確認した。
ユーザー指定どおり、実 DB への `db-migrate` は実行していない。

**判断に迷った点と採用内容**

- 更新 API は部分更新とし、未指定フィールドを保持する。作成時デフォルトを更新 DTO から外し、保存済み値との結合後にも日付・recurrence を検証する。初回統合テストでデフォルトによる意図しない初期化を検出し、修正後に再検証した。
- recurrence はフラットな `recurrenceType` / `intervalDays` / `weekdays` とした。種類の切り替えでは使用しないパラメータを null に正規化し、新しい種類の必須パラメータは要求する。
- Activity 所有者検証は既存 Task の検証関数を抽出して共用。Activity 変更時の kind 解除も既存 Task に合わせた。
- Task の schedule 参照も所有者検証する。削除済み schedule への参照は完了履歴とオフライン同期のため許可し、他ユーザー・存在しない schedule は CRUD で 400、sync で skippedIds とする。
- Task の追加フィールドは既存クライアント行との互換性のため API/sync/domain schema で nullish、共有 record 型では optional nullable とした。
- アカウント完全削除で新しい FK に阻まれないよう、既存の Task 完全削除経路で Task の後、Activity の前に schedule も削除する。通常の schedule soft delete は Task を変更しない。
- 同期バッチ内の schedule ID 重複は 400 とし、Postgres の同一行複数 upsert エラーを防止する。

**変更ファイル一覧**

作業開始時から存在していた未追跡の計画・ADR は変更しておらず、一覧から除外した。

- [apps/backend/app.ts](../../apps/backend/app.ts)
- [apps/backend/feature-sync/index.ts](../../apps/backend/feature-sync/index.ts)
- [apps/backend/feature-sync/task-schedule/index.ts](../../apps/backend/feature-sync/task-schedule/index.ts)
- [apps/backend/feature-sync/task-schedule/taskSchedulePullRoute.test.ts](../../apps/backend/feature-sync/task-schedule/taskSchedulePullRoute.test.ts)
- [apps/backend/feature-sync/task-schedule/taskScheduleSyncHandler.ts](../../apps/backend/feature-sync/task-schedule/taskScheduleSyncHandler.ts)
- [apps/backend/feature-sync/task-schedule/taskScheduleSyncRepository.ts](../../apps/backend/feature-sync/task-schedule/taskScheduleSyncRepository.ts)
- [apps/backend/feature-sync/task-schedule/taskScheduleSyncRoute.test.ts](../../apps/backend/feature-sync/task-schedule/taskScheduleSyncRoute.test.ts)
- [apps/backend/feature-sync/task-schedule/taskScheduleSyncRoute.ts](../../apps/backend/feature-sync/task-schedule/taskScheduleSyncRoute.ts)
- [apps/backend/feature-sync/task-schedule/taskScheduleSyncUsecase.ts](../../apps/backend/feature-sync/task-schedule/taskScheduleSyncUsecase.ts)
- [apps/backend/feature-sync/task-schedule/testHelpers.ts](../../apps/backend/feature-sync/task-schedule/testHelpers.ts)
- [apps/backend/feature-sync/task/taskScheduleLinkSyncRoute.test.ts](../../apps/backend/feature-sync/task/taskScheduleLinkSyncRoute.test.ts)
- [apps/backend/feature-sync/task/taskSyncRepository.ts](../../apps/backend/feature-sync/task/taskSyncRepository.ts)
- [apps/backend/feature-sync/task/taskSyncUsecase.test.ts](../../apps/backend/feature-sync/task/taskSyncUsecase.test.ts)
- [apps/backend/feature-sync/task/taskSyncUsecase.ts](../../apps/backend/feature-sync/task/taskSyncUsecase.ts)
- [apps/backend/feature/index.ts](../../apps/backend/feature/index.ts)
- [apps/backend/feature/task/taskActivityLink.ts](../../apps/backend/feature/task/taskActivityLink.ts)
- [apps/backend/feature/task/taskChangesRepository.ts](../../apps/backend/feature/task/taskChangesRepository.ts)
- [apps/backend/feature/task/taskReadUsecase.ts](../../apps/backend/feature/task/taskReadUsecase.ts)
- [apps/backend/feature/task/taskRepository.ts](../../apps/backend/feature/task/taskRepository.ts)
- [apps/backend/feature/task/taskScheduleLink.ts](../../apps/backend/feature/task/taskScheduleLink.ts)
- [apps/backend/feature/task/taskScheduleLinkRepository.ts](../../apps/backend/feature/task/taskScheduleLinkRepository.ts)
- [apps/backend/feature/task/taskUsecase.ts](../../apps/backend/feature/task/taskUsecase.ts)
- [apps/backend/feature/task/taskWriteRepository.ts](../../apps/backend/feature/task/taskWriteRepository.ts)
- [apps/backend/feature/task/test/taskScheduleLinkRoute.test.ts](../../apps/backend/feature/task/test/taskScheduleLinkRoute.test.ts)
- [apps/backend/feature/taskSchedule/index.ts](../../apps/backend/feature/taskSchedule/index.ts)
- [apps/backend/feature/taskSchedule/taskScheduleHandler.ts](../../apps/backend/feature/taskSchedule/taskScheduleHandler.ts)
- [apps/backend/feature/taskSchedule/taskScheduleRepository.ts](../../apps/backend/feature/taskSchedule/taskScheduleRepository.ts)
- [apps/backend/feature/taskSchedule/taskScheduleRoute.ts](../../apps/backend/feature/taskSchedule/taskScheduleRoute.ts)
- [apps/backend/feature/taskSchedule/taskScheduleUsecase.ts](../../apps/backend/feature/taskSchedule/taskScheduleUsecase.ts)
- [apps/backend/feature/taskSchedule/test/helpers.ts](../../apps/backend/feature/taskSchedule/test/helpers.ts)
- [apps/backend/feature/taskSchedule/test/taskScheduleRoute.test.ts](../../apps/backend/feature/taskSchedule/test/taskScheduleRoute.test.ts)
- [apps/backend/feature/taskSchedule/test/taskScheduleValidationRoute.test.ts](../../apps/backend/feature/taskSchedule/test/taskScheduleValidationRoute.test.ts)
- [docs/plan/scheduled-tasks-phase1a-report.md](../../docs/plan/scheduled-tasks-phase1a-report.md)
- [infra/drizzle/migrations/0043_hot_firedrake.sql](../../infra/drizzle/migrations/0043_hot_firedrake.sql)
- [infra/drizzle/migrations/meta/0043_snapshot.json](../../infra/drizzle/migrations/meta/0043_snapshot.json)
- [infra/drizzle/migrations/meta/_journal.json](../../infra/drizzle/migrations/meta/_journal.json)
- [infra/drizzle/schema/index.ts](../../infra/drizzle/schema/index.ts)
- [infra/drizzle/schema/taskScheduleSchema.ts](../../infra/drizzle/schema/taskScheduleSchema.ts)
- [infra/drizzle/schema/taskSchema.ts](../../infra/drizzle/schema/taskSchema.ts)
- [packages/domain/index.ts](../../packages/domain/index.ts)
- [packages/domain/task/taskRecord.ts](../../packages/domain/task/taskRecord.ts)
- [packages/domain/task/taskRepository.ts](../../packages/domain/task/taskRepository.ts)
- [packages/domain/task/taskSchema.ts](../../packages/domain/task/taskSchema.ts)
- [packages/domain/task/types.ts](../../packages/domain/task/types.ts)
- [packages/domain/taskSchedule/index.ts](../../packages/domain/taskSchedule/index.ts)
- [packages/domain/taskSchedule/recurrenceSchema.ts](../../packages/domain/taskSchedule/recurrenceSchema.ts)
- [packages/domain/taskSchedule/taskScheduleSchema.test.ts](../../packages/domain/taskSchedule/taskScheduleSchema.test.ts)
- [packages/domain/taskSchedule/taskScheduleSchema.ts](../../packages/domain/taskSchedule/taskScheduleSchema.ts)
- [packages/types/index.ts](../../packages/types/index.ts)
- [packages/types/request/CreateTaskRequest.ts](../../packages/types/request/CreateTaskRequest.ts)
- [packages/types/request/CreateTaskScheduleRequest.ts](../../packages/types/request/CreateTaskScheduleRequest.ts)
- [packages/types/request/UpdateTaskRequest.ts](../../packages/types/request/UpdateTaskRequest.ts)
- [packages/types/request/UpdateTaskScheduleRequest.ts](../../packages/types/request/UpdateTaskScheduleRequest.ts)
- [packages/types/request/index.ts](../../packages/types/request/index.ts)
- [packages/types/response/GetTaskScheduleResponse.ts](../../packages/types/response/GetTaskScheduleResponse.ts)
- [packages/types/response/GetTasksResponse.ts](../../packages/types/response/GetTasksResponse.ts)
- [packages/types/response/index.ts](../../packages/types/response/index.ts)
- [packages/types/sync/index.ts](../../packages/types/sync/index.ts)
- [packages/types/sync/request/task.ts](../../packages/types/sync/request/task.ts)
- [packages/types/sync/request/taskSchedule.ts](../../packages/types/sync/request/taskSchedule.ts)
- [packages/types/sync/response/task.ts](../../packages/types/sync/response/task.ts)
- [packages/types/sync/response/taskSchedule.ts](../../packages/types/sync/response/taskSchedule.ts)

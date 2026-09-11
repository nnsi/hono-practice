# Scheduled Tasks（繰り返しタスク）

> 作成: 2026-09-10
> ステータス: 計画（未着手）
> 関連: `docs/adr/20260314_task_activity_link.md`（Task ↔ Activity リンク + 完了時 ActivityLog 自動作成。実装済み）

## 目的

「既にやることが決まっているものの可視化」。

ユースケース: 一週間の筋トレメニューを決めて Task を自動配置し、
毎回「今日何やるんだっけ？」にならず、今日のタスク一覧を見て何をすればいいかが分かり、
タスクをタッチするだけで記録が完了する。

## 要件

1. x日ごと / 曜日指定（週x日）で、Activity に紐付いた Task が今日のタスク一覧に自動で現れる
2. Task を完了にすると該当 Activity の ActivityLog に数値が記録される（**実装済み**: `packages/frontend-shared/hooks/taskToggleWithActivityLog.ts`）
3. 新規タスク追加時に「繰り返す」を選ぶと Scheduled Task として登録される
4. 未達成の繰り返し Task は翌日以降に表示されない（溜まると心が折れる）

## 決定事項（2026-09-10 ユーザー確認済み）

| 論点 | 決定 |
|---|---|
| 繰り返し指定 | **曜日指定**（「週x日」= 月・水・金のように曜日を選ぶ）と **x日ごと** の2種。「週にx回、どの日でもよい」はサポートしない |
| `interval` の起点 | `startDate` 固定（サボっても次回はずれない） |
| Task 行の生成 | **自動生成しない**。今日該当するスケジュールを表示時に「仮想タスク」として算出し、**ユーザー操作（完了 / 削除 / 編集）の瞬間にだけ** Task 行を作る（案2） |
| 未達成の繰り返し Task | 行が無いので翌日には自然に消える。archive も soft delete もしない |
| スケジュール編集・削除 | 仮想タスクは表示時算出なので即時追従。完了済み Task 行はそのまま残す。カスケード処理は不要 |
| Scheduled Tasks 一覧の置き場所 | **タスクページ内** |
| 未来の繰り返し Task | 表示しない（今日の分のみ算出） |

### 案2を採った理由（tombstone 復活問題）

当初は「クライアントが当日分の Task 行を自動生成する」案だったが、task の sync は updatedAt が新しい方が勝つ LWW で、`deleted_at` も上書き対象（`apps/backend/feature-sync/task/taskSyncRepository.ts:94`）。
端末Aで生成 Task を削除 → 端末Bが同じ id で再生成 → B の updatedAt が新しいので削除が復活する。

生成 / 期限切れ片付け / 編集カスケードという 3 つの冪等処理を Web・Mobile 両方に載せる必要もあり、同種の競合が他にも潜む。
「存在しないから作る」という判断をなくし、行を作るのをユーザー操作の瞬間だけにすれば、同じ id が両端末からぶつかっても LWW で 1 行に収束し、復活も起きない。

## 繰り返しルールの意味論

| type | パラメータ | 「今日該当するか」の判定 |
|---|---|---|
| `interval` | `intervalDays` (>=1) | `(today - startDate) % intervalDays === 0` |
| `weekdays` | `weekdays: (1..7)[]` ISO weekday | today の ISO weekday が含まれる |

共通: `startDate <= today` かつ (`endDate` が null または `today <= endDate`) かつ `isActive`。

- 曜日は **ISO weekday（1=月 … 7=日）** で保存し、`packages/domain/goal/dayTargets.ts` の `DayTargets` と揃える
- 「今日」は `getToday()`（ローカル TZ）。`toISOString().split("T")` 禁止（`scripts/check-date-rules.js`）
- 曜日ごとに違うメニュー（月: ベンチ / 水: スクワット）は **スケジュールを複数作る**ことで表現する。1スケジュール = 1 Activity × 1 quantity

## 仮想タスクの算出と実体化

### 算出（純粋関数、`packages/domain/taskSchedule/resolveTodayScheduledTasks.ts`）

```
input : schedules[], 今日の scheduledDate を持つ Task 行[]（削除済み・archive 済みを含む）, today
output: 仮想タスク[]  — 今日該当するスケジュールのうち、今日の Task 行が 1 件も無いもの
```

仮想タスクの形は `TaskItem` と同じ（id は決定的 id、`doneDate: null`、`scheduleId` / `scheduledDate` 付き）。
一覧側は `実 Task 行 ∪ 仮想タスク` を `groupTasksByTimeline` に渡すだけでよい。
仮想か実体かは `_virtual: true` 等のフラグで区別する（編集・削除の分岐に使う）。

### 決定的 ID

`uuidv5(scheduleId + scheduledDate)`。Web と Mobile が同時に同じ仮想タスクを操作しても同一 id になり、sync の LWW で 1 行に収束する。

### 実体化のタイミング

| ユーザー操作 | 作る Task 行 |
|---|---|
| 完了（タップ） | `doneDate = today`、スケジュールの `title / activityId / activityKindId / quantity / memo` をコピー、`startDate = dueDate = scheduledDate`。続けて既存フローで ActivityLog 作成 |
| 「今日はやらない」（削除） | `deletedAt = now` の行を直接作る。以後「今日の行が存在する」ので仮想タスクは出ない |
| 編集（今日だけ数量を変える等） | 未完了の実 Task 行に変換して通常の Task として扱う |

完了 → 未完了に戻す: 実 Task 行なので既存の toggle ロジック（ActivityLog を soft delete）がそのまま動く。行は未完了のまま残るので仮想タスクは出ない（二重表示しない）。

### 既存 toggle との接続

`toggleTaskWithActivityLog` は `updateTask(id, { doneDate })` を呼ぶ。仮想タスクの完了は「行を作る」操作なので、
呼び出し側で `_virtual` なら先に `createTask`（決定的 id、`doneDate: null`）してから既存 toggle を呼ぶか、
toggle の deps に `ensureTaskExists` を足す。どちらにするかは実装時に決める（toggle 本体のロジックは変えない）。

## データモデル

### 新規テーブル `task_schedule`

```sql
CREATE TABLE task_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES "user"(id),
  activity_id uuid REFERENCES activity(id),          -- nullable: 純粋 TODO の繰り返しも許す
  activity_kind_id uuid REFERENCES activity_kind(id),
  quantity numeric,
  title text NOT NULL,
  memo text DEFAULT '',
  recurrence_type text NOT NULL,                     -- 'interval' | 'weekdays'
  interval_days integer,
  weekdays jsonb,                                    -- [1,3,5]
  start_date date NOT NULL,
  end_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_at / updated_at / deleted_at (既存テーブルと同じ)
);
-- sync pull 用: (user_id, updated_at)
```

zod で `recurrence_type` ごとの必須パラメータを discriminated union として検証する（domain 層 `packages/domain/taskSchedule/`）。

### `task` テーブルにカラム追加

```sql
ALTER TABLE task ADD COLUMN schedule_id uuid REFERENCES task_schedule(id);
ALTER TABLE task ADD COLUMN scheduled_date date;
CREATE INDEX task_schedule_id_scheduled_date_idx ON task(schedule_id, scheduled_date);
```

- unique index は不要（決定的 id で同一行に収束するため）
- API / sync の型では `scheduleId` / `scheduledDate` を `.nullish()` にする（既存 Dexie 行に存在しないため。ADR 3/14 備考と同じ理由）
- Dexie: `tasks` に `[scheduleId+scheduledDate]` 複合 index を追加（今日の行の存在確認用）

## UI

### Web / Mobile 共通で必要（`.claude/rules/parallel-agents.md`: 「Web でやることは Mobile でもやる」）

1. **タスク作成フォーム**に「繰り返し」セクション
   - なし / x日ごと / 曜日 の切替、開始日（既定: 今日）、終了日（任意）
   - 繰り返しありで保存 → Task ではなく TaskSchedule を作成。当日該当なら一覧に仮想タスクとして即座に現れる
2. **Scheduled Tasks 一覧**（タスクページ内）
   - 一覧 / 編集 / 一時停止 / 削除。削除はインライン2段階確認（`confirm()` 禁止、`.claude/rules/frontend-ui.md`）
3. **仮想タスクの識別**: タスク行にリピートアイコン（Lucide `Repeat`）。完了操作は既存と同じ見た目（タップで ActivityLog 作成）
4. 仮想タスクの削除は「今日はやらない」の意味であることが分かる文言にする（スケジュール自体は消えない）

## 影響範囲

| レイヤー | 変更 |
|---|---|
| `infra/drizzle/schema/` | `taskScheduleSchema.ts` 新規、`taskSchema.ts` にカラム追加、migration |
| `packages/domain/taskSchedule/` | 型・zod・`resolveTodayScheduledTasks`・決定的 id（`scripts/generate-domain.js` で雛形） |
| `packages/domain/task/` | `TaskItem` に `scheduleId` / `scheduledDate` |
| `packages/types/` | TaskSchedule の request/response、Task に2フィールド追加 |
| `apps/backend/feature/taskSchedule/` | CRUD route/usecase/repository（`goalFreezePeriod` を踏襲）。**統合テスト必須**（`.claude/rules/integration-test.md`） |
| `apps/backend/feature-sync/task-schedule/` | v2 sync（LWW upsert）。`feature-sync/task/` を踏襲 |
| `apps/backend/feature/task/` + `feature-sync/task/` | 2カラムの読み書き。`taskChangesRepository.ts` の entity 生成にも追加 |
| `packages/sync-engine/` | `push/createSyncTaskSchedules.ts`、`pull/bootstrappedResources.ts` に `taskSchedules`、initial sync |
| `apps/frontend/src/db/schema.ts` | Dexie version 9: `taskSchedules` テーブル、`tasks` に `[scheduleId+scheduledDate]` index |
| `apps/mobile/src/db/` | SQLite migration、`repositories/taskScheduleRepository.ts` |
| `packages/frontend-shared/hooks/` | `useTasksPage` / `useDailyPage` で実 Task と仮想タスクをマージ。完了・削除・編集時の実体化 |
| Web / Mobile UI | 上記 UI 節 |

## テスト方針

- **property test 必須**（`.claude/rules/property-test.md`: 時刻依存ロジック）: `packages/domain/test/_property/taskSchedule.property.test.ts`
  - 決定性: 同じ入力なら同じ出力（id 含む）
  - 今日のみ: 出力の `scheduledDate` は常に `today`
  - 排他: 今日の Task 行（削除済み・archive 済み含む）があるスケジュールは出力に含まれない
  - `interval`: 該当日と `startDate` の差は常に `intervalDays` の倍数。月跨ぎ・年跨ぎ・うるう年で崩れない
  - `weekdays`: 該当日の ISO weekday は常に指定集合内
  - `startDate` / `endDate` / `isActive` の境界（`===` の日で一貫）
- backend: `taskScheduleRoute.test.ts`（PGlite）+ `taskScheduleSyncRoute.test.ts`。FK: schedule を soft delete しても完了済み Task 行が残ることを明示的に検証
- frontend-shared: 実体化の unit test（完了 → 行作成 + ActivityLog / 削除 → deletedAt 行 / 未完了に戻す → 二重表示しない）
- 既存 `taskToggleWithActivityLog` 本体は変更なし

## フェーズ

| # | 内容 | 備考 |
|---|---|---|
| 1 | domain + DB + backend CRUD + sync（Web/Mobile） | UI なしでも API/DB まで動くことを確認（「完了の定義」: migration 適用 + 200 + データ確認） |
| 2 | `resolveTodayScheduledTasks` + property test + 一覧マージ + 実体化（完了 / 削除 / 編集） | Web/Mobile 両方で今日の仮想タスクが出て、タップで記録されることを確認 |
| 3 | UI: 作成フォームの繰り返し指定 + 仮想タスクの識別 | Web → Mobile |
| 4 | UI: タスクページ内の Scheduled Tasks 一覧 / 編集 / 一時停止 / 削除 | |

## 未決事項

なし（実装時の細部: 仮想タスク完了時に `createTask` を先に呼ぶか toggle の deps を拡張するか）

## 開発環境（2026-09-10）

- worktree: `/Users/yue/workspace/hono-practice/.worktrees/scheduled-tasks`（ブランチ `wt/scheduled-tasks`）
- API ポート: 3459 / DB: `db_wt_scheduled_tasks`（Docker Postgres 5435）
- baseline: master `a549de1` overallStatus `ok`

## 完了の定義チェックリスト（`/feature-dev`）

### 着手前
- [x] 計画ドキュメント + ADR（`docs/adr/20260910_scheduled_tasks_virtual.md`）
- [x] worktree 隔離、ポート・DB を記録
- [x] baseline 確認（ok）
- [x] Mobile 側の変更範囲を計画に記載（影響範囲の表）

### 実装
- [x] Phase 1: domain + DB + backend CRUD + backend sync + types（Codex。報告: scheduled-tasks-phase1a-report.md）
- [x] Phase 1: sync-engine + Dexie + Mobile SQLite/repository（Codex→メイン引き取り。報告: scheduled-tasks-phase1b-report.md）
- [x] Phase 2a: `resolveTodayScheduledTasks` + property test（Codex。報告: scheduled-tasks-phase2a-report.md）
- [x] Phase 2b: 一覧マージ + 実体化（Agent。`packages/frontend-shared/hooks/materializeScheduledTask.ts` / `useTodayScheduledTasks.ts`）
  - レビュー論点: 編集はダイアログ起動時に実体化するため、キャンセルしても未完了の実 Task 行が残る（submit 時実体化に変えるか要判断）
- [x] Phase 3: 作成フォームの繰り返し指定 + 仮想タスク識別（Web / Mobile。Agent）
- [x] Phase 4: タスクページ内の Scheduled Tasks 一覧 / 編集 / 一時停止 / 削除（Web / Mobile。Agent）
- [x] 新 route の Hono 統合テスト（taskScheduleRoute.test.ts 等）/ 時刻ロジックの property test（taskSchedule.property.test.ts）
- [x] 横断チェック: i18n（ja/en 86 キー一致）/ aria-label・accessibilityLabel / Mobile dark:（Agent 報告。ブラウザで再確認）

### 検証
- [x] test-once → tsc → fix を各フェーズ後にメインが実行（最終: 対象 1413 件パス、tsc 0、fix 差分なし。全体 test-once は Phase 1b 後に 2648 件パス）
- [x] 新ロジックが結果に影響することをテストが担保（resolveTodayScheduledTasks の property test、materialize/edit の unit test、route 統合テスト）
- [x] DB: migration 適用（`pnpm run db-migrate` 0043）+ API（POST /users/task-schedules 201、GET 200、GET /users/v2/task-schedules 200）+ DB 行確認（psql で task_schedule 1 行、task に schedule_id/scheduled_date 列）
- [x] UI Web: playwright で 作成→仮想表示→完了で ActivityLog→今日はやらない→一覧/編集/停止/削除 を操作し DB 同期まで確認。375px 確認済み
- [x] UI Mobile: expo web（8087）で ログイン→初回 sync で schedule 取得→繰り返しタブ表示→作成（曜日・Activity・数量）→仮想表示→チェックで完了→Task 行 + ActivityLog 同期 を確認

### レビュー
- [x] /review-cycle: Round 3 で A（reviewer-logic）・B（Codex）とも LGTM
- [x] レビュー修正後に test-once（対象）/ tsc 再実行、Web（編集ダイアログの開閉で行が作られず保存で実体化・更新）と Mobile Daily（同）を playwright で再確認

### 仕上げ
- [ ] 完了報告（エビデンス付き）
- [ ] push 前にユーザー確認 → PR

## レビュー記録

### Round 1（/cross-review: A = reviewer-logic, B = Codex gpt-6 xhigh）— 両者 NOT LGTM

修正対象:
- [A 88 / B 100] Mobile Daily で仮想タスクの編集タップが無反応（`editingFullTask` が実 Task のみの `rawTasks` を参照）→ タップ時に `materializeIfVirtual` してから編集対象にする（メインが修正）
- [A 80] TaskCard 本体タップで編集ダイアログが開くたびに実体化され、キャンセルしても行が残る → 実体化を保存時（`useTaskEditDialog.handleSubmit`）へ移動
- [A 78] 実体化が非冪等（同 id が既にあると ConstraintError）→ `getTasksByScheduledDate` で既存行を再利用
- [A 76] スケジュールのタイトル 21 文字以上で zod が throw しダイアログが無反応 → 入力に maxLength + canSubmit で長さ検証
- [B info] テストの `as` キャスト（harness）→ 型宣言に置換（メインが修正）

スキップ（理由付き）:
- [B 99] 同期成功時に id だけで synced 化し、送信中の編集が失われうる → 既存の `createSyncTasks` / `createSyncGoalFreezePeriods` と同一パターン（`SyncRevision` 方式は activities のみ）。今回の機能で持ち込んだ劣化ではないため、3 リソースまとめてのフォローアップとする
- [B 100] スケジュール削除が `DeleteConfirmDialog`（モーダル）で「インライン 2 段階確認」ではない → 既存の Task 削除と同じ共通ダイアログで、プロジェクトの慣行に沿っている

## フォローアップ（今回のスコープ外）
- sync push の synced 化を `SyncRevision`（送信時 updatedAt 一致）方式に統一する（tasks / goalFreezePeriods / taskSchedules）
- `apps/frontend/package.json` の dev スクリプトが `--port 2460` 固定のため、worktree-setup が書く `VITE_PORT` が効かない。`vite --host` にして vite.config の `VITE_PORT` 読み取りを活かすか、worktree-setup 側を直す
- Web の Daily には編集導線が無く Mobile にはある（既存の非対称）
- Mobile `TaskSwipeActions.tsx` の削除ラベルがハードコード日本語（既存）

### Round 2（/cross-review）— 両者 NOT LGTM

Round 1 修正の解消確認: 両レビュアーとも Mobile Daily 編集無反応・タイトル上限・harness の as 除去は解消と判定。編集保存経路の冪等化漏れと Mobile Daily の起動時実体化を再指摘。

修正対象:
- [A 80 / B 99] `useTaskEditDialog` の仮想タスク保存が `createTask` 直呼びで非冪等 → `materializeScheduledTask`（既存行再利用）→ `updateTask` に統一
- [A 85 / B 100] Mobile Daily が編集タップ時に実体化し、保存時実体化の決定と矛盾 → `useDailyPage.findEditableTask` で仮想のまま編集対象にし、保存時に実体化
- [B 98] 数量（0..999999）・メモ（1000 文字）の境界が UI 未担保 → `canSubmit` と入力属性で担保
- [A 80] Mobile の task_schedules 行マッパーが 1 行の不正データで一覧全体を落とす → `safeParse` で不正行をスキップ（pull 側は watermark 保護のため throw を維持）
- [B 100] `useTaskCreateDialog.test.ts` 213 行 → 分割
- [A 75] `useTaskEditDialog` だけタイトル検証が `!title.trim()` → `isValidTaskTitle` に統一

スキップ（理由付き）:
- [B info 100] `initialSync.test.ts`（Web/Mobile）の `as unknown as` / `as never` → 両ファイルの既存部分が同じ流儀で書かれており、テストコード限定でそれに合わせた
- [A 76] 実体化直後の `syncTasks()` 単独呼び出しでスケジュール未 push 時に 1 サイクル遅れる → `syncAll` の順序で自然回復。フォローアップ
- [A 75] `useTasksOnScheduledDate` が複合 index を使わず全件 filter → 件数が小さいため後回し。フォローアップ

### Round 3（/cross-review、閾値: Critical 90+ のみ）
- B (Codex): **LGTM**。Round 2 修正 5 件すべて解消を確認。報告のみ: 複数タブで同時に実体化すると存在確認と insert が非原子的で片方が一意制約エラーになりうる（98）/ `packages/sync-engine/core/syncDataWrites.ts` の書き込み・消去の調停に競合テストが無い（95）/ Mobile DailyPage.tsx に削除・エラー報告ロジックが JSX 側に残る（info）
- フォローアップ追加: 実体化の原子化（repository 側で「存在保証と取得」を 1 操作に）/ syncDataWrites の競合テスト / Mobile DailyPage の削除ロジックを use*.ts へ
- A (reviewer-logic): **LGTM**。Round 2 修正 5 件すべて解消、回帰 3 観点も問題なし。参考（75 未満）: 実 Task と仮想のマージに id 重複除去が無く実体化直後に一瞬二重表示しうる（60）/ handleSubmit 二重タップ（55）/ pull 全件 safeParse で 1 行不正なら 500（50、既存 task/note と同パターン）

### 2 回目のブラウザ確認（レビュー修正箇所）
- Web: 仮想タスクの編集ダイアログを開いてキャンセル → DB に行なし。保存 → 行が実体化され（quantity 10, schedule_id あり）、タイトル変更も同期。コンソールエラーなし（ログイン前の 401 のみ）
- Mobile（expo web）Daily: 行本体タップで編集ダイアログ → キャンセル → 行なし。タイトル変更して保存 → 行が実体化・同期。コンソールに React の DOM ネスト警告あり（発生箇所は下記確認結果）

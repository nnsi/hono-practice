# Scheduled Tasks: Task 行を自動生成せず仮想タスクとして表示する

## ステータス

決定

## コンテキスト

繰り返しタスク（x日ごと / 曜日指定）を導入するにあたり、当初は「クライアントが当日分の Task 行を自動生成する」設計だった。
しかし task の sync は updatedAt が新しい方が勝つ LWW で、`deleted_at` も上書き対象（`apps/backend/feature-sync/task/taskSyncRepository.ts`）。
端末Aで生成 Task を削除した後、端末Bが同じ決定的 id で再生成すると、B の updatedAt が新しいため削除が復活する（tombstone 復活問題）。
加えて、生成・期限切れの片付け・スケジュール編集時のカスケードという 3 つの冪等処理を Web/Mobile 両方に載せる必要があり、同種の競合が他にも潜む。

計画の全体: `docs/plan/scheduled-tasks.md`

## 決定事項

1. **Task 行は自動生成しない**。今日該当するスケジュールを表示時に純粋関数で「仮想タスク」として算出し、実 Task 行とマージして一覧に出す
2. **ユーザー操作の瞬間にだけ Task 行を作る**（完了 → `doneDate` 付き行 + ActivityLog / 「今日はやらない」 → `deletedAt` 付き行 / 編集 → 未完了行）
3. Task 行の id は `uuidv5(scheduleId + scheduledDate)` で決定的に作る。両端末が同時に操作しても LWW で 1 行に収束する
4. 「今日の行が 1 件でも存在する（削除済み・archive 済み含む）」スケジュールは仮想タスクを出さない
5. 繰り返しは `interval`（startDate 起点固定）と `weekdays`（ISO weekday）の 2 種。「週にx回どの日でも」はサポートしない
6. 未達成の繰り返しタスクは行が無いので翌日に自然に消える。archive も soft delete もしない
7. スケジュールの編集・削除は仮想タスクに即時反映され、完了済み Task 行はそのまま残す。カスケード処理は持たない

## 結果

- 「存在しないから作る」という判断が無くなり、tombstone 復活と二重生成の競合が構造的に起きない
- 生成トリガー・片付けジョブ・カスケードが不要になり、Web/Mobile に載せる冪等処理が減る
- 一覧 hook（`useTasksPage` / `useDailyPage`）で実 Task と仮想タスクのマージが必要になる
- 「やらなかった」記録は行として残らないが、スケジュール規則と完了 Task の差分から後で算出できる

## 備考

- 既存の `toggleTaskWithActivityLog` 本体は変えない。仮想タスクの完了は「行を作ってから既存 toggle を呼ぶ」形で接続する
- `scheduleId` / `scheduledDate` は API/sync 型で `.nullish()`（既存 Dexie 行に存在しないため。ADR 2026-03-14 と同じ理由）

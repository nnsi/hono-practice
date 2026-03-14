# Task ↔ Activity リンク + タスク完了時 ActivityLog 自動作成

## ステータス

決定

## コンテキスト

プロダクト戦略議論（3/13）で、「やる前にアプリを開く」導線は Task にある、という整理がされた。現状の Task は Activity / Goal と完全に独立した軽量 TODO であり、タスク完了がアクティビティ記録に繋がらない。

Actiko のユーザーフローは「やる → アプリを開く → 記録する → 閉じる」だが、Task があれば「アプリを開く → 何やるか確認（Task）→ やる → 完了チェック → 自動記録 → 閉じる」という導線が作れる。

## 決定事項

### Phase 1: Task ↔ Activity リンク基盤

`task` テーブルに3カラムを追加:

```sql
ALTER TABLE task ADD COLUMN activity_id uuid REFERENCES activity(id);
ALTER TABLE task ADD COLUMN activity_kind_id uuid;
ALTER TABLE task ADD COLUMN quantity numeric;
```

全て nullable。リンクなしのタスク（従来の軽量 TODO）も引き続きサポート。

### Phase 2: タスク完了時 ActivityLog 自動作成

タスク完了時に **フロントエンド（共有フック）** で ActivityLog を作成する。

```typescript
// useTasksPage / useDailyPage の handleToggleDone 内
if (!task.isDone && task.activityId && task.activityKindId && task.quantity != null) {
  await activityLogRepository.createActivityLog({
    activityId: task.activityId,
    activityKindId: task.activityKindId,
    quantity: task.quantity,
    taskId: task.id,  // 自動作成ログを識別するためのリンク
    ...
  });
}
```

#### バックエンドではなくフロントエンドで作成する理由

- オフラインファーストアーキテクチャに適合（ローカル DB に即座に保存、バックグラウンドで sync）
- 既存の syncEngine が ActivityLog の同期を担当するので追加のバックエンドエンドポイント不要
- TasksPage と DailyPage の両方の handleToggleDone に同じロジックを適用

#### 完了 → 未完了に戻した場合

`taskId` でリンクされた ActivityLog を soft delete する。手動で作成した ActivityLog（`taskId: null`）には影響しない。

### Phase 3: ActivityLog に taskId 追加

自動作成ログと手動作成ログを分離するため、`activity_log` テーブルに `task_id uuid` (nullable) を追加。

taskId 追加の代替案として「同一タスク・同一日の重複防止（upsert）」も検討したが、手動ログとの衝突リスクがあるため却下。`taskId` による明示的なリンクで自動/手動を完全に分離する。

### quantity 条件

`task.quantity != null` の場合のみ自動作成。数量が設定されていないタスクは記録ショートカットの対象外。

## 結果

- タスク完了が即座にアクティビティ記録に反映される（「最速で活動量を記録する」コンセプトとの整合）
- 完了 → 未完了 → 再完了のサイクルで ActivityLog が正しく作成・削除・再作成される
- 手動記録とタスク経由の自動記録が `taskId` で明確に分離される
- 全レイヤー（DB → domain型 → API型 → backend v1/v2 → sync → frontend shared → Web/Mobile UI）に一貫して反映

## 備考

- `new Date().toISOString().split("T")[0]` は UTC 日付を返すため、JST 深夜に完了すると日付がずれる。`dayjs().format("YYYY-MM-DD")` に変更してローカルタイムゾーンを使用する。
- `UpsertActivityLogRequestSchema` で `taskId` を `.nullable()` ではなく `.nullish()` にする必要がある。既存の ActivityLog（Dexie に保存済み）には `taskId` フィールドが存在せず、sync 時に `undefined` が送られるため。

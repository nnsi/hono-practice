# ドメインロジックの packages/domain 一括集約

## 概要

`apps/backend/domain/` のエンティティ定義と、フロントエンド/バックエンドに散在するフィルタリング・ソート・計算ロジックを `packages/domain/` に一括集約する。

関連ADR: `docs/adr/20260225_domain_logic_to_packages.md`

## 移行方針

`apps/backend/domain/` を廃止し、全ドメインを `packages/domain/` に一括移動する。ドメイン定義の所在を1箇所に統一し、認知負荷を下げる。

| 対象 | 移動先 |
|------|--------|
| Task | `packages/domain/task/` |
| Activity | `packages/domain/activity/` |
| ActivityLog | `packages/domain/activityLog/` |
| Goal (ActivityGoal) | `packages/domain/goal/` |
| User | `packages/domain/user/` |
| Auth | `packages/domain/auth/` |
| Subscription | `packages/domain/subscription/` |
| ApiKey | `packages/domain/apiKey/` |
| Branded IDs | 各ドメインディレクトリ内 |

## 現状のファイル配置

```
apps/backend/domain/          # 全ドメインのエンティティ定義（廃止予定）
  task/         task.ts, taskId.ts, task.test.ts
  activity/     activity.ts, activityId.ts, activityKindId.ts
  activityLog/  activityLog.ts, activityLogId.ts
  activitygoal/ activityGoal.ts, activityGoalId.ts
  user/         user.ts, userId.ts
  auth/         userProvider.ts, refreshToken.ts, userProviderId.ts
  subscription/ subscription.ts, subscriptionId.ts
  apiKey.ts, apiKeyId.ts
  index.ts

packages/domain/              # 既存: v2同期用フラット型のみ
  models/   activity.ts, activityLog.ts
  validation/ activityLog.ts

ロジック散在箇所:
  apps/frontend-v2/src/hooks/useTasks.ts                    # タスクフィルタリング
  apps/frontend-v2/src/components/tasks/taskGrouping.ts     # タスクグルーピング
  apps/frontend-v2/src/components/goal/GoalCard.tsx         # ゴールbalance計算
  apps/frontend-v2/src/components/goal/GoalStatsDetail.tsx  # ゴールstats計算
  apps/backend/feature/task/taskRepository.ts               # SQLフィルタリング
  apps/backend/feature/activitygoal/activityGoalService.ts  # balance/inactiveDates計算
  apps/backend/feature/goal/goalUsecase.ts                  # N+1回避+stats集約
```

## 目標ディレクトリ構成

```
packages/domain/
  task/
    taskEntity.ts         # Zodスキーマ (discriminated union) + TaskId
    taskFilters.ts        # isTaskVisibleOnDate, isActiveTask, isArchivedTask
    taskSorters.ts        # sortByArchivedAtDesc
    taskGrouping.ts       # groupTasksByTimeline (frontendから移動)
    taskFilters.test.ts
    taskGrouping.test.ts
    index.ts
  activity/
    activityEntity.ts     # Zodスキーマ + ActivityId, ActivityKindId
    activitySorters.ts    # sortByOrderIndex
    index.ts
  activityLog/
    activityLogEntity.ts  # Zodスキーマ + ActivityLogId
    activityLogFilters.ts # isActiveLog, filterLogsByDateRange
    activityLogValidation.ts # 既存validation移動
    index.ts
  goal/
    goalEntity.ts         # Zodスキーマ + ActivityGoalId
    goalBalance.ts        # calculateGoalBalance (純粋関数化)
    goalStats.ts          # calculateGoalStats, getInactiveDates
    goalFilters.ts        # isGoalActive, isGoalEnded
    goalBalance.test.ts
    goalStats.test.ts
    index.ts
  user/
    userEntity.ts         # Zodスキーマ + UserId
    index.ts
  auth/
    userProvider.ts       # UserProvider エンティティ + UserProviderId
    refreshToken.ts       # RefreshToken エンティティ
    index.ts
  subscription/
    subscriptionEntity.ts # Zodスキーマ + SubscriptionId + isActive/isPremium等
    index.ts
  apiKey/
    apiKeyEntity.ts       # Zodスキーマ + ApiKeyId + generate/mask/hash
    index.ts
  errors.ts               # DomainValidateError
  index.ts                # バレルエクスポート

apps/backend/domain/ → 完全廃止
```

## 実装ステップ

### Phase 1: 基盤 — 共通エラー型 + バックエンド専用ドメインの移動

**共通エラー型:**
- `DomainValidateError` → `packages/domain/errors.ts` に移動（全ファクトリ関数が使用）

**バックエンド専用ドメインの移動（ロジック抽出不要、そのまま移動）:**
- `apps/backend/domain/user/` → `packages/domain/user/`（UserId + User エンティティ）
- `apps/backend/domain/auth/` → `packages/domain/auth/`（UserProvider + RefreshToken）
- `apps/backend/domain/subscription/` → `packages/domain/subscription/`
- `apps/backend/domain/apiKey.ts` + `apiKeyId.ts` → `packages/domain/apiKey/`

**注意:** branded ID は各ドメインディレクトリ内に配置する（`ids/` ディレクトリは作らない）。例: `UserId` は `packages/domain/user/userEntity.ts` 内。

### Phase 2: Task ドメイン

#### 2a: エンティティ移動

`apps/backend/domain/task/task.ts` → `packages/domain/task/taskEntity.ts`

- 既存の discriminated union (new/persisted/archived) を移動
- Dexie バリアントを追加:

```typescript
const DexieTaskSchema = BaseTaskSchema.merge(
  z.object({
    type: z.literal("dexie"),
    _syncStatus: z.enum(["pending", "synced", "failed"]),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
);
```

- `BaseTask` 型をエクスポート（フィルタ/ソート関数の引数型として使用）

#### 2b: ビジネスロジック抽出

**taskFilters.ts** — `useTasks.ts` + `taskRepository.ts` から抽出:
```typescript
isTaskVisibleOnDate(task, date): boolean
isActiveTask(task): boolean
isArchivedTask(task): boolean
filterTasksByDate(tasks, date): T[]
```

**taskSorters.ts** — `taskRepository.ts` の `orderBy` から抽出:
```typescript
sortByArchivedAtDesc(tasks): T[]
sortByCreatedAtDesc(tasks): T[]
```

**taskGrouping.ts** — `apps/frontend-v2/src/components/tasks/taskGrouping.ts` を移動:
```typescript
groupTasksByTimeline(tasks, options): GroupedTasks
```
- UIフレームワーク非依存の純粋関数なのでそのまま移動可能

#### 2c: 呼び出し元の置き換え

| ファイル | 変更内容 |
|---------|---------|
| `apps/frontend-v2/src/hooks/useTasks.ts` | インラインフィルタ → `isTaskVisibleOnDate` 等 |
| `apps/frontend-v2/src/components/tasks/useTasksPage.ts` | `./taskGrouping` → `@packages/domain` |
| `apps/backend/feature/task/taskRepository.ts` | **SQLフィルタ/ソートはそのまま残す**。型参照のみ変更 |

**バックエンドSQL方針:** repository の SQL フィルタリング/ソートはインデックスの恩恵があるためそのまま残す。純粋関数が正（single source of truth）として存在し、テストで正しさを検証できるため、SQLとの二重管理による乖離リスクは許容可能。

### Phase 3: Activity ドメイン

#### 3a: エンティティ移動

`apps/backend/domain/activity/activity.ts` → `packages/domain/activity/activityEntity.ts`

- 既存の discriminated union (new/persisted) を移動
- `ActivityKind` も同ファイルに含める
- Dexie バリアントを追加
- 既存の `packages/domain/models/activity.ts`（フラット型）は entityEntity.ts の `BaseActivity` で置き換え

#### 3b: ビジネスロジック抽出

**activitySorters.ts:**
```typescript
sortByOrderIndex(items): T[]  // Activity, ActivityKind 両方で使用
```

#### 3c: 呼び出し元の置き換え

| ファイル | 変更内容 |
|---------|---------|
| `apps/frontend-v2/src/hooks/useActivities.ts` | `orderBy("orderIndex")` → `sortByOrderIndex` |
| `apps/backend/feature/activity/activityRepository.ts` | SQL orderBy は性能上維持可。型参照のみ変更 |

### Phase 4: ActivityLog ドメイン

#### 4a: エンティティ移動

`apps/backend/domain/activityLog/activityLog.ts` → `packages/domain/activityLog/activityLogEntity.ts`

- 既存 discriminated union を移動
- Dexie バリアントを追加
- 既存の `packages/domain/models/activityLog.ts`（フラット型）を置き換え
- 既存の `packages/domain/validation/activityLog.ts` を `activityLogValidation.ts` に統合

#### 4b: ビジネスロジック抽出

**activityLogFilters.ts:**
```typescript
isActiveLog(log): boolean           // !deletedAt
filterLogsByDateRange(logs, from, to): T[]
filterLogsByActivity(logs, activityId): T[]
sumQuantity(logs): number           // ゴール計算で頻出
```

### Phase 5: Goal ドメイン

#### 5a: エンティティ移動

`apps/backend/domain/activitygoal/activityGoal.ts` → `packages/domain/goal/goalEntity.ts`

- 既存 discriminated union を移動
- `GoalBalance` value object も移動
- Dexie バリアントを追加

#### 5b: ビジネスロジック抽出 ← 最重要

**goalBalance.ts** — `activityGoalService.ts` + `GoalCard.tsx` から抽出:
```typescript
type GoalBalanceInput = {
  dailyTargetQuantity: number;
  startDate: string;
  endDate: string | null;
};
type LogEntry = { date: string; quantity: number | null };

/** ゴールのバランス（貯金/負債）を計算する純粋関数 */
calculateGoalBalance(
  goal: GoalBalanceInput,
  logs: LogEntry[],
  today: string,  // 呼び出し元がtz解決済みの日付文字列を渡す
): { currentBalance: number; totalTarget: number; totalActual: number; elapsedDays: number }
```

- バックエンドの `activityGoalService.calculateCurrentBalance` とフロントの `GoalCard.tsx:133-143` を統一
- DB依存を排除。ログ配列を引数で受け取る純粋関数にする
- **タイムゾーン方針**: domain 層は tz を知らない。`today` は呼び出し元が解決する

**goalStats.ts** — `GoalStatsDetail.tsx` + `activityGoalService.ts` から抽出:
```typescript
type DailyRecord = { date: string; quantity: number; achieved: boolean };

/** 日次レコードを生成 */
generateDailyRecords(
  goal: GoalBalanceInput,
  logs: LogEntry[],
  today: string,
): DailyRecord[]

/** 統計を計算 */
calculateGoalStats(dailyRecords: DailyRecord[]): {
  average: number;
  max: number;
  maxConsecutiveDays: number;
  achievedDays: number;
  activeDays: number;
}

/** やらなかった日付を取得 */
getInactiveDates(
  goal: GoalBalanceInput,
  logs: LogEntry[],
  today: string,
): string[]
```

**goalFilters.ts:**
```typescript
isGoalActive(goal): boolean    // isActive && !deletedAt
isGoalEnded(goal): boolean     // endDate < today
```

#### 5c: 呼び出し元の置き換え

| ファイル | 変更内容 |
|---------|---------|
| `apps/frontend-v2/src/components/goal/GoalCard.tsx` | ローカル balance 計算 → `calculateGoalBalance` |
| `apps/frontend-v2/src/components/goal/GoalStatsDetail.tsx` | stats 計算 → `calculateGoalStats`, `generateDailyRecords` |
| `apps/frontend-v2/src/components/goal/useGoalsPage.ts` | フィルタ → `isGoalActive` |
| `apps/backend/feature/activitygoal/activityGoalService.ts` | `calculateCurrentBalance` / `getInactiveDates` → 共有関数に置き換え（SQLではなくJSロジックのため、残す理由がない） |
| `apps/backend/feature/goal/goalUsecase.ts` | service 経由 → 共有関数直接呼び出し |

### Phase 6: `apps/backend/domain/` 完全廃止 + import パス修正

**削除対象（全て packages/domain/ に移動済み）:**
- `apps/backend/domain/` → ディレクトリごと完全削除
- `packages/domain/models/` → 削除（各ドメインの entity に統合済み）
- `packages/domain/validation/` → 削除（activityLog に統合済み）
- `apps/frontend-v2/src/components/tasks/taskGrouping.ts` → 削除（packages に移動済み）

**import パス修正対象（広範囲）:**
- `apps/backend/feature/*/` — 全 repository, usecase, handler, route
- `apps/backend/feature-v2/` — 全 v2 route
- `apps/backend/domain/index.ts` — re-export 元を変更
- `packages/types/index.ts` — re-export 元を変更
- `apps/frontend-v2/src/hooks/` — 全フック
- `apps/frontend-v2/src/components/goal/` — GoalCard, GoalStatsDetail, useGoalsPage
- `apps/frontend-v2/src/components/tasks/` — useTasksPage

### Phase 7: 検証

```bash
pnpm run tsc         # 型チェック
pnpm run test-once   # 全テスト (既存 + 新規ドメインテスト)
pnpm run fix         # フォーマット
```

## チェックリスト

### Phase 1: 基盤 + バックエンド専用ドメイン
- [ ] `DomainValidateError` → `packages/domain/errors.ts`
- [ ] User ドメイン移動（UserId + User エンティティ）
- [ ] Auth ドメイン移動（UserProvider + RefreshToken）
- [ ] Subscription ドメイン移動
- [ ] ApiKey ドメイン移動

### Phase 2: Task
- [ ] エンティティ移動 + Dexie バリアント追加
- [ ] `taskFilters.ts` + テスト
- [ ] `taskSorters.ts`
- [ ] `taskGrouping.ts` 移動 + テスト
- [ ] フロント/バックエンドの呼び出し元置き換え

### Phase 3: Activity
- [ ] エンティティ移動 + Dexie バリアント追加
- [ ] `activitySorters.ts`
- [ ] 呼び出し元置き換え

### Phase 4: ActivityLog
- [ ] エンティティ移動 + Dexie バリアント追加
- [ ] `activityLogFilters.ts`
- [ ] 既存 validation 統合
- [ ] 呼び出し元置き換え

### Phase 5: Goal
- [ ] エンティティ移動 + Dexie バリアント追加
- [ ] `goalBalance.ts` + テスト（最重要: フロント/バックエンド統一）
- [ ] `goalStats.ts` + テスト
- [ ] `goalFilters.ts`
- [ ] フロント `GoalCard` / `GoalStatsDetail` 置き換え
- [ ] バックエンド `activityGoalService` 置き換え

### Phase 6: クリーンアップ
- [ ] `apps/backend/domain/` 完全削除
- [ ] `packages/domain/models/` + `validation/` 削除
- [ ] import パス一括修正
- [ ] `packages/domain/index.ts` バレルエクスポート整理

### Phase 7: 検証
- [ ] `pnpm run tsc` パス
- [ ] `pnpm run test-once` 全テストパス
- [ ] `pnpm run fix` パス

## 事前に解決済みの懸念事項

- **JST タイムゾーン計算** → 純粋関数は `today: string` を引数で受け取る設計とする。tz 解決は呼び出し元の責務（フロント: ブラウザtz、バックエンド: User.tz で将来対応）。domain 層にタイムゾーンの概念は入れない
- **既存 `packages/domain/models/` の利用箇所** → 確認済み。`packages/types-v2/response/activityLog.ts` が `ActivityLog` 型を import しているのみ。`packages/domain/index.ts` のバレルエクスポートを維持すれば import パスは変更不要
- **ApiKey の Web Crypto API** → Node 19+ で `crypto.getRandomValues` / `crypto.subtle` は標準利用可能。現環境で問題なし
- **バックエンド SQL フィルタ/ソート** → そのまま残す。純粋関数が single source of truth として存在し、テストで正しさを検証できるため、二重管理による乖離リスクは許容可能

## 並列エージェント分割案

Phase 2〜5 はドメイン間の依存が少ないため、Phase 1（IDs）完了後に並列実行可能:

- **Agent A**: Task ドメイン（Phase 2）
- **Agent B**: Activity + ActivityLog ドメイン（Phase 3 + 4）
- **Agent C**: Goal ドメイン（Phase 5）
- **リーダー**: Phase 1（IDs）→ 並列起動 → Phase 6（クリーンアップ）→ Phase 7（検証）

ファイル競合防止: 各エージェントは自ドメインのファイルのみ編集。`packages/domain/index.ts` はリーダーが最後に一括修正。

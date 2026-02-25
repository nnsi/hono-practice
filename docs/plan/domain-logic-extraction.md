# ドメインロジックの packages/domain 一括集約

## 概要

`apps/backend/domain/` のエンティティ定義と、フロントエンド/バックエンドに散在するフィルタリング・ソート・計算ロジックを `packages/domain/` に一括集約する。

関連ADR: `docs/adr/20260225_domain_logic_to_packages.md`

## 型アーキテクチャ

### 3つの型レイヤ

| レイヤ | 用途 | 特徴 | 配置 |
|--------|------|------|------|
| **Entity Schema** | バックエンドの永続化・バリデーション | Zod, `Date` 型, branded ID, nested 関連 | `packages/domain/*/schema.ts` |
| **Sync Record** | v2 API レスポンス / Dexie ストレージ互換 | plain TS type, `string` 日付, flat 構造 | `packages/domain/*/record.ts` |
| **Predicate Input** | 純粋関数の引数型 | `Pick` / 構造的部分型で最小フィールドのみ要求 | 各 predicate/sorter ファイル内で定義 |

### 設計原則

1. **純粋関数は構造的部分型で受け取る**: `isTaskVisibleOnDate(task: { doneDate?: string | null; ... }, date: string)` — Entity でも Dexie Record でも渡せる
2. **Dexie 型はフロントエンドに残す**: `DexieTask`, `DexieActivity` 等は `apps/frontend-v2/src/db/schema.ts` に留まる。Entity union には混ぜない
3. **Entity Schema はバックエンド中心**: discriminated union (new/persisted/archived) はバックエンドの永続化フローで使用。フロントエンドからは直接参照しない（tree-shaking で除外）
4. **Sync Record は API 互換型**: 既存の `packages/domain/models/` の flat 型を引き継ぐ。v2 sync API のレスポンス型として `packages/types-v2` から参照される
5. **日付型の規約**: Entity Schema は `z.date()`（DB列マッピング）。Sync Record と純粋関数は `string`（YYYY-MM-DD）のみ。domain 層で `new Date()` 禁止
6. **循環依存防止**: ドメイン間の import は branded ID 型のみ許可（例: `UserId`）。エンティティ間の直接参照は禁止。ActivityLog → Activity の nested 関連は Entity Schema 内に閉じる
7. **エクスポート方針**: `packages/domain/index.ts`（root バレル）からは Sync Record 型 + predicates / sorters / records のみエクスポート。Entity Schema（Zod 依存）は root バレルからエクスポートせず、サブパス（`@packages/domain/task/taskSchema`）から直接 import する。これによりフロントエンドバンドルから Zod を確実に除外し、Entity 名と Record 名の衝突（`Activity` vs `ActivityRecord`）も回避する

### ActivityLog の nested vs flat 問題

- Backend Entity: `activity: Activity` (nested), `activityKind: ActivityKind | null` (nested)
- Sync Record / Dexie: `activityId: string` (flat), `activityKindId: string | null` (flat)
- → Entity Schema と Sync Record は別ファイルで独立定義。純粋関数は flat フィールドのみ使用

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
  errors.ts               # DomainValidateError（HTTP status なし）
  task/
    taskSchema.ts         # Zod Entity Schema (new/persisted/archived) + TaskId
    taskPredicates.ts     # isTaskVisibleOnDate, isActiveTask, isArchivedTask
    taskSorters.ts        # sortByArchivedAtDesc, sortByCreatedAtDesc
    taskGrouping.ts       # groupTasksByTimeline(tasks, options, today)
    types.ts              # TaskItem, GroupedTasks 等（frontendから移動）
    taskPredicates.test.ts
    taskGrouping.test.ts
    index.ts
  activity/
    activitySchema.ts     # Zod Entity Schema + ActivityId, ActivityKindId
    activityRecord.ts     # ActivityRecord type（既存 models/activity.ts を移動・リネーム）
    activitySorters.ts    # sortByOrderIndex
    index.ts
  activityLog/
    activityLogSchema.ts  # Zod Entity Schema（nested activity/activityKind）+ ActivityLogId
    activityLogRecord.ts  # ActivityLogRecord type（既存 models/activityLog.ts を移動・リネーム）
    activityLogPredicates.ts  # isActiveLog, filterLogsByDateRange
    activityLogValidation.ts  # 既存 validation 移動
    index.ts
  goal/
    goalSchema.ts         # Zod Entity Schema + ActivityGoalId
    goalBalance.ts        # calculateGoalBalance (純粋関数化)
    goalStats.ts          # calculateGoalStats, generateDailyRecords, getInactiveDates
    goalPredicates.ts     # isGoalActive, isGoalEnded
    goalBalance.test.ts
    goalStats.test.ts
    index.ts
  user/
    userSchema.ts         # Zod Entity Schema + UserId
    index.ts
  auth/
    userProviderSchema.ts # UserProvider Entity + UserProviderId
    refreshTokenSchema.ts # RefreshToken Entity
    index.ts
  subscription/
    subscriptionSchema.ts # plain type + SubscriptionId + isActive/isPremium等（Zod化はスコープ外）
    index.ts
  apiKey/
    apiKeySchema.ts       # plain type + ApiKeyId + generate/mask/hash（Zod化はスコープ外）
    index.ts
  index.ts                # バレルエクスポート

apps/backend/domain/ → Phase 6a で shim 化、Phase 6b で完全削除
```

## 実装ステップ

### Phase 0: 基盤整備（他の全 Phase の前提条件）

1. **DomainValidateError の移動と修正**
   - `packages/domain/errors.ts` に新規作成（`status: 400` プロパティなし）
   - `apps/backend/error/domainValidateError.ts` は即削除せず、`export { DomainValidateError } from "@packages/domain/errors"` の re-export ブリッジに変更。これにより `@backend/error` からの既存 import（domain 内 + feature 層）がすべてそのまま動作する
   - バックエンドのエラーハンドラ（`honoWithErrorHandling.ts`）で `err.status` 依存を `instanceof DomainValidateError` → 400 固定に変更
   - feature 層の `DomainValidateError` 利用箇所（`taskRepository.ts`, `refreshTokenRepository.ts` 等）も移行対象に含める。Phase 6b で `@backend/error` のブリッジを削除する際に import パスを `@packages/domain/errors` に一括変更

2. **packages/domain/package.json に依存追加**
   ```json
   {
     "dependencies": {
       "zod": "^3.x",
       "uuid": "^11.x",
       "dayjs": "^1.x"
     }
   }
   ```

3. **tsconfig パスエイリアス確認**
   - `@packages/domain` が `packages/domain` を正しく解決することを確認（既存で動作中のため、追加設定は不要の見込み）

4. **domain ファイルの DomainValidateError import 更新**
   - `apps/backend/error/domainValidateError.ts` を re-export ブリッジにしたため、domain ファイル側の import パスは移動前に変更する必要はない（`@backend/error` のまま動作する）
   - 各ドメインを `packages/domain/` に移動した後、移動先のファイルで import を `from "../errors"` 等の相対パスに変更する（ファイル深さに応じたパスを使用）

### Phase 1: バックエンド専用ドメインの移動

Entity Schema の移動（@backend/error 依存は Phase 0 で解消済み）:
- `apps/backend/domain/user/` → `packages/domain/user/`（UserId + User エンティティ）
- `apps/backend/domain/auth/` → `packages/domain/auth/`（UserProvider + RefreshToken）
- `apps/backend/domain/subscription/` → `packages/domain/subscription/`
- `apps/backend/domain/apiKey.ts` + `apiKeyId.ts` → `packages/domain/apiKey/`

**注意:** branded ID は各ドメインディレクトリ内に配置する。例: `UserId` は `packages/domain/user/userSchema.ts` 内。

**`new Date()` の除去（設計原則5 準拠）:**
- `refreshToken.ts`: `createRefreshToken` / `validateRefreshToken` 内の `new Date()` → `now: Date` パラメータを引数で受け取る形にリファクタ。呼び出し元（usecase層）が `new Date()` を渡す。テストコード（`authUsecase.test.ts` の `createMockRefreshToken` 等）もシグネチャ変更に合わせて修正する
- `subscription.ts`: `isActive()` / `isInTrial()` 内の `new Date()` → `isSubscriptionActive(sub, now: Date)` のように純粋関数として外出し。呼び出し元が `now` を渡す

**ApiKey / Subscription の型について:**
- `ApiKey` は plain type + ユーティリティ関数（Zod スキーマではない）。Zod 化はスコープ外、既存の plain type をそのまま移動する
- `Subscription` も plain type + ファクトリ関数パターン。計画の `subscriptionSchema.ts` は命名だが実態は plain type。Zod 化は別タスク

**import 暫定対応（shim 方式）:**

shim は3レベルで設置する:

1. **root shim**: `apps/backend/domain/index.ts` — `packages/domain/index.ts`（root バレル）は Sync Record + predicates のみエクスポートするため、`export * from "@packages/domain"` だけではバックエンドの Entity / ファクトリ関数 import が壊れる。root shim は各サブドメインの schema ファイルも明示的に re-export する:
   ```typescript
   // apps/backend/domain/index.ts (root shim)
   export * from "@packages/domain";                              // Records + predicates
   export * from "@packages/domain/user/userSchema";              // Entity + UserId
   export * from "@packages/domain/auth";                         // Auth entities
   export * from "@packages/domain/task/taskSchema";              // Task Entity + TaskId
   export * from "@packages/domain/activity/activitySchema";      // Activity Entity + IDs
   export * from "@packages/domain/activityLog/activityLogSchema"; // ActivityLog Entity
   export * from "@packages/domain/goal/goalSchema";              // Goal Entity + GoalId
   export * from "@packages/domain/subscription/subscriptionSchema";
   export * from "@packages/domain/apiKey/apiKeySchema";
   ```
2. **サブディレクトリ shim**: `apps/backend/domain/user/index.ts` → `export * from "@packages/domain/user"` — `@backend/domain/user` 形式の import を維持
3. **ファイル単位 shim**: `apps/backend/domain/user/userId.ts` → `export * from "@packages/domain/user/userSchema"` — `@backend/domain/user/userId` 形式の deep file import を維持

deep file import の実例（shim 必須）:
- `apps/backend/feature/auth/authHandler.ts` → `@backend/domain/user/userId`
- `apps/backend/feature/auth/test/authUsecase.test.ts` → `@backend/domain/auth/refreshToken`, `@backend/domain/user/user`, `@backend/domain/user/userId`
- `packages/types/index.ts` → `@backend/domain/activitygoal/activityGoal`（注: 移動先は `packages/domain/goal/goalSchema.ts` であるため、shim は `export * from "@packages/domain/goal/goalSchema"` とする）

**`@domain/*` エイリアスへの対応:**
`tsconfig.json` に `"@domain/*": ["apps/backend/domain/*"]` が定義されており、以下のファイルで使用されている:
- `apps/backend/feature/auth/authHandler.ts:3` → `@domain/auth/refreshToken`
- `apps/backend/feature/auth/authUsecase.ts:16-17` → `@domain/auth/refreshToken`, `@domain/auth/userProvider`
- `apps/backend/feature/auth/refreshTokenRepository.ts:8` → `@domain/auth/refreshToken`

`@domain/*` は `@backend/domain/*` と同じ物理ファイルに解決されるため、shim 方式でそのまま動作する。Phase 6b で `@domain/*` パターンのファイルも `@packages/domain` に一括変更し、tsconfig.json の `@domain/*` エイリアス自体も削除する。

各ドメイン移動時に、旧ファイルを file-level shim に変更する。Phase 6b で全 import パスを `@packages/domain` に一括変更し、shim を削除する。

### Phase 2: Task ドメイン

#### 2a: Entity Schema 移動

`apps/backend/domain/task/task.ts` → `packages/domain/task/taskSchema.ts`

- 既存の discriminated union (new/persisted/archived) をそのまま移動
- **Dexie バリアントは追加しない**（Dexie 型は frontend の `db/schema.ts` に留まる）
- `BaseTask` 型をエクスポート（参照用）

#### 2b: ビジネスロジック抽出

**taskPredicates.ts** — `useTasks.ts` のフィルタロジックを抽出:
```typescript
// 構造的部分型: Entity でも Dexie Record でも渡せる
type TaskDateFields = {
  doneDate?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  deletedAt?: string | Date | null;  // truthiness チェックのみ
  archivedAt?: string | Date | null; // truthiness チェックのみ
};

export function isTaskVisibleOnDate(task: TaskDateFields, date: string): boolean { ... }
export function isActiveTask(task: Pick<TaskDateFields, "deletedAt" | "archivedAt">): boolean { ... }
export function isArchivedTask(task: Pick<TaskDateFields, "deletedAt" | "archivedAt">): boolean { ... }
```

**taskSorters.ts:**
```typescript
type Sortable<K extends string> = { [P in K]?: string | Date | null };

export function sortByArchivedAtDesc<T extends Sortable<"archivedAt">>(tasks: T[]): T[] { ... }
export function sortByCreatedAtDesc<T extends Sortable<"createdAt">>(tasks: T[]): T[] { ... }
```

**taskGrouping.ts** — `apps/frontend-v2/src/components/tasks/taskGrouping.ts` を移動:
```typescript
// today を引数で受け取る（dayjs() 直接呼び出しを排除して純粋関数化）
export function groupTasksByTimeline(
  tasks: TaskItem[],
  options: GroupingOptions,
  today: string,  // 呼び出し元が tz 解決済みの日付を渡す
): GroupedTasks { ... }
```
- 入出力型 (`TaskItem`, `GroupedTasks`, `GroupingOptions`) は `packages/domain/task/types.ts` に定義
- 内部で `dayjs(today)` を使用（`dayjs()` は禁止）

#### 2c: 呼び出し元の置き換え

| ファイル | 変更内容 |
|---------|---------|
| `apps/frontend-v2/src/hooks/useTasks.ts` | インラインフィルタ → `isTaskVisibleOnDate` 等 |
| `apps/frontend-v2/src/components/tasks/useTasksPage.ts` | `./taskGrouping` → `@packages/domain`。`today` 引数を追加 |
| `apps/backend/feature/task/taskRepository.ts` | **SQL フィルタ/ソートはそのまま残す**。Entity Schema の import パスのみ変更 |

**バックエンド SQL 方針:** repository の SQL フィルタリング/ソートはインデックスの恩恵があるためそのまま残す。仕様ソースは共有テストケース、実装は SQL/JS の二系統。

### Phase 3: Activity ドメイン

#### 3a: Entity Schema 移動

`apps/backend/domain/activity/activity.ts` → `packages/domain/activity/activitySchema.ts`

- 既存の discriminated union (new/persisted) をそのまま移動
- `ActivityKind` スキーマも同ファイルに含める
- **Dexie バリアントは追加しない**

#### 3b: Sync Record 移動

`packages/domain/models/activity.ts` → `packages/domain/activity/activityRecord.ts`

- 型名を `Activity` → `ActivityRecord` にリネーム
- `packages/domain/index.ts` から `ActivityRecord` を `Activity` としても re-export（後方互換。`packages/types-v2` 等の既存消費者向け）
- Entity Schema の `Activity` 型（Zod由来）は root バレルからエクスポートしない（サブパス import のみ）。これにより名前衝突を回避

#### 3c: ビジネスロジック抽出

**activitySorters.ts:**
```typescript
export function sortByOrderIndex<T extends { orderIndex?: string | null }>(items: T[]): T[]
```

#### 3d: 呼び出し元の置き換え

| ファイル | 変更内容 |
|---------|---------|
| `apps/frontend-v2/src/hooks/useActivities.ts` | Dexie `orderBy("orderIndex")` はインデックス利用のため維持。型参照のみ変更 |
| `apps/backend/feature/activity/activityRepository.ts` | SQL orderBy は性能上維持。Entity Schema import パスのみ変更 |

### Phase 4: ActivityLog ドメイン

#### 4a: Entity Schema 移動

`apps/backend/domain/activityLog/activityLog.ts` → `packages/domain/activityLog/activityLogSchema.ts`

- nested `activity: Activity`, `activityKind: ActivityKind | null` を含むバックエンド Entity Schema
- **Sync Record とは独立**: nested vs flat の違いを明確に分離
- **`new Date()` の除去**: `createActivityLogEntity` 内の未来日チェック・10年前チェックで `new Date()` を使用している。日付バリデーションを `activityLogValidation.ts` に分離し、Entity ファクトリからは除外する。バックエンドの usecase 層でバリデーション関数を呼び出す
- **`isActiveLog` の適用範囲注記**: Entity Schema (persisted) には `deletedAt` フィールドがない。`isActiveLog` は主に Sync Record / Dexie Record 向けの predicate

#### 4b: Sync Record 移動

`packages/domain/models/activityLog.ts` → `packages/domain/activityLog/activityLogRecord.ts`

- 型名を `ActivityLog` → `ActivityLogRecord` にリネーム
- `packages/domain/index.ts` から `ActivityLogRecord` を `ActivityLog` としても re-export（後方互換。`packages/types-v2` が `ActivityLog` を参照しているため）
- Entity Schema の `ActivityLog` 型は root バレルからエクスポートしない。`ActivityLogSchema`（validation）と `ActivityLogSchema`（entity）の名前衝突も、validation 側を `ActivityLogInputSchema` にリネームして回避

#### 4c: ビジネスロジック抽出

**activityLogPredicates.ts:**
```typescript
type LogFields = {
  date: string;
  deletedAt?: string | null;
  activityId: string;
};

export function isActiveLog(log: Pick<LogFields, "deletedAt">): boolean { ... }
export function filterLogsByDateRange<T extends Pick<LogFields, "date">>(logs: T[], from: string, to: string): T[] { ... }
export function filterLogsByActivity<T extends Pick<LogFields, "activityId">>(logs: T[], activityId: string): T[] { ... }
export function sumQuantity(logs: { quantity: number | null }[]): number { ... }
```

#### 4d: Validation 統合

`packages/domain/validation/activityLog.ts` → `packages/domain/activityLog/activityLogValidation.ts`

### Phase 5: Goal ドメイン

#### 5a: Entity Schema 移動

`apps/backend/domain/activitygoal/activityGoal.ts` → `packages/domain/goal/goalSchema.ts`

- 既存 discriminated union をそのまま移動
- `GoalBalance` value object も移動
- **Dexie バリアントは追加しない**

#### 5b: ビジネスロジック抽出（最重要）

**goalBalance.ts** — `activityGoalService.ts` + `GoalCard.tsx` から統一:
```typescript
type GoalBalanceInput = {
  dailyTargetQuantity: number;
  startDate: string;       // YYYY-MM-DD
  endDate: string | null;  // YYYY-MM-DD
};
type LogEntry = { date: string; quantity: number | null };

/** ゴールのバランス（貯金/負債）を計算する純粋関数 */
export function calculateGoalBalance(
  goal: GoalBalanceInput,
  logs: LogEntry[],
  today: string,  // 呼び出し元が tz 解決済みの YYYY-MM-DD を渡す
): GoalBalance

type GoalBalance = {
  currentBalance: number;
  totalTarget: number;
  totalActual: number;
  dailyTarget: number;          // dailyTargetQuantity をそのまま返す（API互換）
  daysActive: number;           // startDate から today まで（両端含む）
  lastCalculatedDate: string;   // today をそのまま返す（API互換）
}
```

- バックエンドの `activityGoalService.calculateCurrentBalance` とフロントの `GoalCard.tsx` を統一
- **日数計算の仕様定義**:
  - `daysActive`: startDate から min(today, endDate) まで、両端含む。`dayjs(end).diff(dayjs(start), 'day') + 1`
  - startDate が未来の場合: `daysActive = 0`
  - endDate が null の場合: today まで
  - endDate が過去の場合: endDate まで（today は使わない）
- DB依存を排除。ログ配列を引数で受け取る純粋関数にする
- **`daysActive` の定義**: `dayjs(today).diff(dayjs(startDate), 'day') + 1`（両端含む）。GoalCard と activityGoalService で計算方法が異なるため、この定義に統一する
- **日付計算方針**: 内部の日付反復は `dayjs(date).add(1, 'day').format('YYYY-MM-DD')` を使用。`new Date()` 禁止。これにより tz 由来のズレを完全排除
- **タイムゾーン方針**: domain 層は tz を知らない。`today` は呼び出し元が解決する（フロント: ブラウザ tz、バックエンド: JST ユーティリティ→将来は User.tz）

**goalStats.ts** — `GoalStatsDetail.tsx` + `activityGoalService.ts` から抽出:
```typescript
type DailyRecord = { date: string; quantity: number; achieved: boolean };

export function generateDailyRecords(
  goal: GoalBalanceInput,
  logs: LogEntry[],
  today: string,
): DailyRecord[]

export function calculateGoalStats(dailyRecords: DailyRecord[]): {
  average: number;
  max: number;
  maxConsecutiveDays: number;
  achievedDays: number;
  activeDays: number;
}

export function getInactiveDates(
  goal: GoalBalanceInput,
  logs: LogEntry[],
  today: string,
): string[]
// 注: 既存実装の日付ループ (`new Date()` + `setDate()`) を
// `dayjs(date).add(1, 'day').format('YYYY-MM-DD')` に書き換える（設計原則5 準拠）
```

**goalPredicates.ts:**
```typescript
export function isGoalActive(goal: { isActive: boolean; deletedAt?: string | Date | null }): boolean
export function isGoalEnded(goal: { endDate: string | null }, today: string): boolean
```

#### 5c: 呼び出し元の置き換え

| ファイル | 変更内容 |
|---------|---------|
| `apps/frontend-v2/src/components/goal/GoalCard.tsx` | ローカル balance 計算 → `calculateGoalBalance` |
| `apps/frontend-v2/src/components/goal/GoalStatsDetail.tsx` | stats 計算 → `calculateGoalStats`, `generateDailyRecords` |
| `apps/frontend-v2/src/components/goal/useGoalsPage.ts` | フィルタ → `isGoalActive` |
| `apps/backend/feature/activitygoal/activityGoalService.ts` | `calculateCurrentBalance` / `getInactiveDates` → 共有関数に置き換え |
| `apps/backend/feature/goal/goalUsecase.ts` | service 経由 → 共有関数直接呼び出し |

**Phase 5 スコープ外（activityGoalService 内の残置ロジック）:**
- `getBalanceHistory`: 日付反復で履歴配列を生成。今回は置き換え対象外（バックエンド API 専用の集計ロジック）
- `adjustDailyTarget`: 目標値変更の永続化。DB 操作を含むため domain 層には移せない
- これらは後続タスクとして必要に応じて対応

### Phase 6: クリーンアップ（段階的）

#### Phase 6a: Shim 確認（3レベル全て）

- **root shim**: `apps/backend/domain/index.ts` が root バレル + 各サブドメイン schema を re-export する shim になっていることを確認（Phase 1 で設置済み）
- **サブディレクトリ shim**: 各 `apps/backend/domain/*/index.ts` が `@packages/domain/*` を re-export していることを確認
- **ファイル単位 shim**: deep file import 対象のファイル（`userId.ts`, `user.ts`, `refreshToken.ts`, `activityGoal.ts` 等）が対応する `@packages/domain` パスを re-export していることを確認
- これら shim により、`@backend/domain` および `@domain/*` 経由の既存 import パスは変更なしで動作する

#### Phase 6b: 完全削除

全 import パスの書き換え完了後:

**削除対象:**
- `apps/backend/domain/` → ディレクトリごと完全削除（shim 含む）
- `packages/domain/models/` → 削除（各ドメインの record.ts に統合済み）
- `packages/domain/validation/` → 削除（activityLog に統合済み）
- `apps/frontend-v2/src/components/tasks/taskGrouping.ts` → 削除（packages に移動済み）

**import パス修正対象（広範囲）:**
- `apps/backend/feature/*/` — 全 repository, usecase, handler, route の import を `@packages/domain` に変更（`@backend/domain` と `@domain/*` 両方のパターンを置換）
- `apps/backend/feature-v2/` — 全 v2 route
- `apps/backend/lib/honoWithErrorHandling.ts` — `DomainValidateError` の import を `@packages/domain/errors` に変更
- `tsconfig.json` — `@domain/*` エイリアスを削除
- `packages/types/index.ts` — re-export 元を変更
- `packages/types-v2/response/activityLog.ts` — `ActivityLog` の import 元変更（re-export で互換維持）
- `apps/frontend-v2/src/hooks/` — 全フック
- `apps/frontend-v2/src/components/goal/` — GoalCard, GoalStatsDetail, useGoalsPage
- `apps/frontend-v2/src/components/tasks/` — useTasksPage
- **テストファイル**: `task.test.ts`, `goalUsecase.test.ts` 等の import パスも修正対象。`pnpm run tsc` で漏れを網羅的に検出する

### Phase 7: 検証

```bash
pnpm run tsc         # 型チェック
pnpm run test-once   # 全テスト (既存 + 新規ドメインテスト)
pnpm run fix         # フォーマット
```

## チェックリスト

### Phase 0: 基盤整備
- [x] `DomainValidateError` → `packages/domain/errors.ts`（`status: 400` 削除）
- [x] バックエンドエラーハンドラで `instanceof DomainValidateError` → 400 を返すよう修正
- [x] `packages/domain/package.json` に `zod`, `uuid`, `dayjs` 追加
- [x] `apps/backend/error/domainValidateError.ts` を re-export ブリッジに変更（`@backend/error` からの既存 import を維持）。各ドメイン移動時（Phase 1〜5）に移動先ファイルの import を相対パス（`from "../errors"`）に変更

### Phase 1: バックエンド専用ドメイン
- [x] User 移動 + `apps/backend/domain/index.ts` shim 設置
- [x] Auth 移動（`new Date()` → `now` パラメータ化）
- [x] Subscription 移動（`isActive` 等を純粋関数に外出し + `now` パラメータ化）
- [x] ApiKey 移動（plain type のまま。Zod 化はスコープ外）

### Phase 2: Task
- [x] Entity Schema 移動（Dexie バリアント追加しない）
- [x] `taskPredicates.ts` + テスト（構造的部分型で Entity/Dexie 両対応）
- [x] `taskSorters.ts`
- [x] `taskGrouping.ts` 移動 + `today` 引数追加 + 型定義移動 + テスト
- [x] フロント/バックエンドの呼び出し元置き換え

### Phase 3: Activity
- [x] Entity Schema 移動（Dexie バリアント追加しない）
- [x] Sync Record 移動（`models/activity.ts` → `activityRecord.ts`）+ re-export
- [x] `activitySorters.ts`
- [x] 呼び出し元置き換え

### Phase 4: ActivityLog
- [x] Entity Schema 移動（nested 関連含む、Sync Record とは独立）
- [x] `createActivityLogEntity` の日付バリデーション分離（`new Date()` 除去）
- [x] Sync Record 移動（`models/activityLog.ts` → `activityLogRecord.ts`）+ re-export
- [x] `activityLogPredicates.ts`
- [x] Validation 統合
- [x] 呼び出し元置き換え

### Phase 5: Goal
- [x] Entity Schema 移動（Dexie バリアント追加しない）
- [x] `goalBalance.ts` + テスト（最重要: フロント/バックエンド統一、YYYY-MM-DD 文字列ベース）
- [x] `goalStats.ts` + テスト
- [x] `goalPredicates.ts`
- [x] フロント `GoalCard` / `GoalStatsDetail` 置き換え
- [x] バックエンド `activityGoalService` 置き換え

### Phase 6: クリーンアップ
- [x] Phase 6a: 3レベル shim 動作確認（root + サブディレクトリ + ファイル単位）
- [x] Phase 6b: 全 import パス一括修正（`@backend/domain`, `@domain/*` 両パターン + `honoWithErrorHandling.ts`）→ `apps/backend/domain/` 完全削除 + tsconfig `@domain/*` 削除
- [x] `packages/domain/models/` + `validation/` 削除
- [x] `packages/domain/index.ts` バレルエクスポート整理

### Phase 7: 検証
- [x] `pnpm run tsc` パス
- [x] `pnpm run test-once` 全テストパス（661テスト、52ファイル）
- [x] `pnpm run fix` パス

## 解決済みの懸念事項

- **Entity vs Sync Record の型不整合** → 3層の型分離で解決。Entity Schema（Date/nested）と Sync Record（string/flat）を別ファイルで管理。純粋関数は構造的部分型で最小フィールドのみ要求し、両方に対応
- **Dexie バリアントの設計** → Entity union に混ぜない。Dexie 型は frontend に留まる。純粋関数は `{ doneDate?: string | null; deletedAt?: string | Date | null; ... }` のような構造的部分型で Dexie Record にも対応
- **DomainValidateError の HTTP 結合** → `status: 400` を削除。HTTP ステータスはバックエンドのエラーハンドラの責務に移動
- **@backend/error 依存** → Phase 0 で `packages/domain/errors.ts` に移動し、`apps/backend/error/domainValidateError.ts` を re-export ブリッジに変更。domain ファイルは移動前は `@backend/error` のまま動作し、移動後（Phase 1〜5）に相対パス（`from "../errors"`）に変更する
- **packages/domain/package.json** → Phase 0 で `zod`, `uuid`, `dayjs` を依存追加
- **JST タイムゾーン計算** → 純粋関数は `today: string`（YYYY-MM-DD）を引数で受け取る。内部の日付反復は `dayjs(date).add()` で文字列ベース。`new Date()` 禁止。tz 解決は呼び出し元の責務
- **taskGrouping の dayjs() 直接呼び出し** → `today: string` を引数に追加。`dayjs()` → `dayjs(today)` に変更し純粋関数化。入出力型は `packages/domain/task/types.ts` に移動
- **ApiKey の Web Crypto API** → Node 19+ で `crypto.getRandomValues` / `crypto.subtle` は標準利用可能
- **バックエンド SQL** → そのまま残す。仕様ソースは共有テストケース、実装は SQL/JS の二系統
- **Phase 6 の段階化** → Phase 6a（shim 設置・確認）と Phase 6b（完全削除）に分離。import パス修正完了後に削除
- **循環依存防止** → ドメイン間 import は branded ID 型のみ許可。エンティティ間の直接参照禁止
- **Entity ファクトリ内の `new Date()`** → 設計原則5（domain 層で `new Date()` 禁止）に従い、`refreshToken`, `subscription`, `activityLog` の各ファクトリ/バリデーションで `now` パラメータを引数化、または日付バリデーションを分離。呼び出し元（usecase 層）が `new Date()` を渡す
- **ApiKey / Subscription の型** → 既存の plain type をそのまま移動。Zod スキーマ化はスコープ外
- **GoalBalance 返り値型** → 既存の `GoalBalanceSchema`（`dailyTarget`, `daysActive`, `lastCalculatedDate` を含む）に合わせる。計画の `elapsedDays` は `daysActive` に統一
- **dayjs プラグイン** → `isBetween`, `isSameOrBefore` 等のプラグインは各ファイル冒頭で `dayjs.extend()` する。グローバル extend はテストの順序依存を生むため避ける
- **バレルエクスポートと tree-shaking** → `packages/domain/index.ts` からは predicates / sorters / records のみエクスポート。Entity Schema（Zod 依存）はサブパス `@packages/domain/task/taskSchema` から直接 import する方針。フロントエンドバンドルから Zod を確実に除外

## スコープ外（今回の対象外）

- `stats/useStatsPage.ts` のアクティビティ別集計・月次 goal line 判定ロジック → 計算量が大きく独立性が高いため、別途 `stats/aggregation` phase として計画する
- Dexie 型定義の `packages/domain` への移動 → frontend 固有の `_syncStatus` を含むため frontend に留める
- v2 sync API のレスポンス型の再設計 → `packages/types-v2` の型は Sync Record の re-export で対応。API 型自体の変更は不要

## 並列エージェント分割案

Phase 0（基盤整備）+ Phase 1（バックエンド専用ドメイン）完了後、Phase 2〜5 はドメイン間の依存が少ないため並列実行可能:

- **Agent A**: Task ドメイン（Phase 2）
- **Agent B**: Activity + ActivityLog ドメイン（Phase 3 + 4）
- **Agent C**: Goal ドメイン（Phase 5）
- **リーダー**: Phase 0 → Phase 1 → 並列起動 → Phase 6（クリーンアップ）→ Phase 7（検証）

ファイル競合防止:
- 各エージェントは自ドメインのファイルのみ編集
- `packages/domain/index.ts` はリーダーが最後に一括修正
- `apps/backend/domain/index.ts` shim はリーダーが管理

# ドメインロジックの packages/domain への集約

## ステータス

提案

## コンテキスト

現在、ドメインロジックが3箇所に分散している：

| 場所 | 内容 | 問題 |
|------|------|------|
| `apps/backend/domain/` | Zodエンティティ定義（discriminated union）、branded ID | バックエンド専用。フロントエンドから参照できない |
| `apps/frontend-v2/src/hooks/` + `components/` | Dexie フィルタリング・ソート・stats計算ロジック | フロント専用。バックエンドのロジックと二重管理 |
| `apps/backend/feature/*/` | SQLフィルタリング、ゴールbalance計算、N+1回避ロジック | バックエンド専用。JSロジックと乖離しやすい |

実際に発生した問題：
- タスクの日付フィルタリングがバックエンドとフロントエンドで乖離していた（`doneDate`/`dueDate`の考慮漏れ）
- アーカイブ済みタスクのソート順がバックエンドと不一致だった
- ゴールのbalance計算が `GoalCard.tsx` と `activityGoalService.ts` で独立実装されていた

`packages/domain/` は既に存在するが、v2同期用のフラット型（`Activity`, `ActivityLog`）とバリデーションスキーマのみで、ビジネスロジックは含まれていない。

### 前提

- frontend-v1 は削除済み。v1 API は使用されていないが、テスト資産があるためリファクタリングの手本として活用可能
- v2 API は全件返却 → フロントエンドでフィルタリングする設計。ドメインロジックの実体はクライアント側にある
- `apps/backend/domain/` にはバックエンド専用ドメイン（auth, subscription, apiKey）も存在する

## 決定事項

**フロントエンド・バックエンド共通で使用するドメインのエンティティ定義・ビジネスロジックを `packages/domain/` に一括集約する。**

### 全ドメインを packages/domain に移動する

`apps/backend/domain/` は廃止し、全ドメインを `packages/domain/` に集約する。

| ドメイン | 移動先 |
|---------|--------|
| Task | `packages/domain/task/` |
| Activity | `packages/domain/activity/` |
| ActivityLog | `packages/domain/activityLog/` |
| Goal (ActivityGoal) | `packages/domain/goal/` |
| User | `packages/domain/user/` |
| Auth | `packages/domain/auth/` |
| Subscription | `packages/domain/subscription/` |
| ApiKey | `packages/domain/apiKey/` |
| Branded IDs | 各ドメインディレクトリ内 |

Auth/Subscription/ApiKey は現状バックエンドでのみ使用しているが、ドメイン定義の一覧性を優先して一括移動する。フロントエンドから import されなければ tree shaking でバンドルに含まれないため害はない。「ドメイン定義はどこ？」→「`packages/domain/`」で統一する。

### エンティティ定義: discriminated union で環境別バリアントを定義

各ドメインで共通パターンを適用：

```typescript
// 例: packages/domain/task/taskEntity.ts

// 共通ベース（フィルタ/ソート関数はこの型だけを要求する）
const BaseTaskSchema = z.object({ ... });
export type BaseTask = z.infer<typeof BaseTaskSchema>;

// バックエンド永続化済み
const PersistedTaskSchema = BaseTaskSchema.merge(
  z.object({ type: z.literal("persisted"), userId: ..., createdAt: z.date(), ... })
);

// フロントエンド Dexie 用
const DexieTaskSchema = BaseTaskSchema.merge(
  z.object({ type: z.literal("dexie"), _syncStatus: ..., createdAt: z.string(), ... })
);

export const TaskSchema = z.discriminatedUnion("type", [...]);
```

### ビジネスロジック: Base型の部分型を要求する純粋関数

```typescript
// フィルタ/ソートはBaseの部分型だけを要求 → どのバリアントでも渡せる
type TaskDateFields = Pick<BaseTask, "doneDate" | "startDate" | "dueDate" | "deletedAt" | "archivedAt">;
export function isTaskVisibleOnDate(task: TaskDateFields, date: string): boolean { ... }

// ゴール計算もDB非依存の純粋関数
type LogEntry = { date: string; quantity: number | null };
export function calculateGoalBalance(goal: GoalBalanceInput, logs: LogEntry[], calculateDate?: string): GoalBalance { ... }
```

- 副作用なし、DB依存なしの純粋関数
- データ取得は呼び出し元の責務（Dexie or Drizzle）

### 目標ディレクトリ構成

```
packages/domain/
  ids/              # 全branded ID型 + ファクトリ関数
  task/             # エンティティ + フィルタ + ソート + グルーピング
  activity/         # エンティティ + ソート
  activityLog/      # エンティティ + フィルタ + バリデーション
  goal/             # エンティティ + balance計算 + stats計算 + フィルタ
  index.ts
```

## 結果

### ポジティブ

- フィルタリング/ソート/計算の単一ソース化。バックエンドとフロントエンドの乖離が構造的に防止される
- ドメインロジックの単体テストがDB非依存で書ける（Dexie不要、Drizzle不要）
- ゴールのbalance/stats計算が1箇所に集約され、計算結果の一貫性が保証される
- 全ドメインを一括で移行するため、branded ID の参照先が分裂しない

### 制約

- バックエンドの SQL フィルタリングを JS に置き換える箇所がある。大量データ時にパフォーマンス差が出る可能性（現状のデータ量では問題なし。SQL orderBy はインデックスが効くため残す選択肢あり）
- `packages/domain` への依存が増えるため、パッケージの責務を純粋なドメインロジックに限定する
- `packages/domain` にバックエンド専用ドメイン（auth, subscription等）も含まれるが、フロントエンドで import しなければバンドルに含まれないため実害なし

## 備考

- 関連ADR: `20260221_frontend_v2_offline_first.md`（packages/domain の初期設計。パッケージ構成表で `packages/domain` を定義）
- 実装計画: `docs/plan/domain-logic-extraction.md`（Phase 1〜7 の詳細手順、並列エージェント分割案を含む）

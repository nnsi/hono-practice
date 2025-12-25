# Mastra AI機能 アーキテクチャ設計

## 概要

Actikoに「自然言語での活動記録」機能を追加するためのMastra統合アーキテクチャ。

### ユースケース

ユーザーが「30分ランニングした」と入力 → AIが既存Activityを特定 → ActivityLogを自動生成

### 技術スタック

- **AIフレームワーク**: Mastra
- **LLMプロバイダー**: OpenRouter（モデル動的切り替え）
- **実行環境**: Cloudflare Workers（バックエンドのみ）

---

## アーキテクチャ方針

### ディレクトリ構造

```
apps/backend/
├── feature/
│   └── ai/                          # 新規AI機能（feature層として配置）
│       ├── index.ts                 # エクスポート
│       ├── aiRoute.ts               # Route層: DI、エンドポイント
│       ├── aiHandler.ts             # Handler層: 型変換
│       ├── aiUsecase.ts             # Usecase層: ビジネスロジック
│       ├── agent/                   # Mastra Agent定義
│       │   ├── activityLogAgent.ts
│       │   └── index.ts
│       ├── tools/                   # Mastra Tool定義
│       │   ├── findActivityTool.ts
│       │   ├── createActivityLogTool.ts
│       │   └── index.ts
│       └── test/
│           ├── aiUsecase.test.ts
│           └── tools.test.ts
│
├── infra/
│   └── llm/                         # LLMプロバイダー抽象化（新規）
│       ├── index.ts
│       └── openRouterProvider.ts
│
└── lib/
    └── mastra/                      # Mastra設定（新規）
        ├── index.ts
        └── mastraConfig.ts
```

### 責務配置

| 層 | 責務 | AI機能での役割 |
|---|---|---|
| **Route** | DI、HTTPハンドリング | Agent/Repoの注入、エンドポイント提供 |
| **Handler** | 型変換、レスポンス処理 | AIレスポンスの整形 |
| **Usecase** | ビジネスロジック | Agent呼び出し、結果処理 |
| **Agent** | AI推論 | 自然言語解析、Tool選択・実行 |
| **Tool** | 外部機能呼び出し | Repository経由でDB操作 |

---

## 設計判断

### Q1: なぜ `feature/ai/` として配置するのか？

**理由:**
- AI機能は「自然言語での活動記録」という**独立したビジネス機能**
- 既存のfeature（activity, activityLog）と同じ粒度
- Route/Handler/Usecaseの4層構造に自然に適合
- 将来の拡張（AI要約、レコメンド等）も同じ場所に追加可能

**却下した案:**
- `infra/ai/`: AI関連コードにはビジネスロジックが含まれるため不適切
- `lib/mastra/`: ライブラリというより機能なので不適切

### Q2: Agent/Toolはどのレイヤーか？

**結論: feature/ai配下に配置（Usecase層の一部として扱う）**

- **Agent**: Usecaseから呼び出される「AIビジネスロジック実行者」
- **Tool**: Repositoryを呼び出す「AIからDB操作への橋渡し」

Toolは直接Repositoryを使用するが、これはUsecaseがRepositoryを使うのと同様の関係。

### Q3: LLMアダプターの抽象化は必要か？

**結論: 最小限の抽象化（`infra/llm/`）**

- OpenRouterは多数のモデルへのゲートウェイとして機能
- Mastra自体がOpenRouter対応済み（`openrouter/anthropic/claude-3.5-haiku`形式）
- 過度な抽象化は避け、環境変数でモデル切り替え

---

## 実装フロー

```
[ユーザー入力] "30分ランニングした"
        ↓
[Route] POST /users/ai/activity-logs/natural
        ↓
[Handler] リクエスト検証
        ↓
[Usecase] Agent.generate(text, context)
        ↓
[Agent] プロンプトに従いTool選択
        ↓
[findActivityTool] → ActivityRepo → 「ランニング」Activity発見
        ↓
[createActivityLogTool] → ActivityLogRepo → ログ作成
        ↓
[Agent] 結果を返却
        ↓
[Handler] レスポンス整形
        ↓
[クライアント] { activityLog, interpretation }
```

---

## 実装詳細

### Route層 (`aiRoute.ts`)

```typescript
import { Hono } from "hono";
import type { AppContext } from "@backend/context";
import { zValidator } from "@hono/zod-validator";
import { NaturalLanguageActivityLogRequestSchema } from "@dtos/request";

import { newActivityRepository } from "../activity";
import { newActivityLogRepository } from "../activityLog";
import { newAiHandler } from "./aiHandler";
import { newAiUsecase } from "./aiUsecase";
import { createActivityLogAgent } from "./agent";

export function createAiRoute() {
  const app = new Hono<
    AppContext & {
      Variables: {
        h: ReturnType<typeof newAiHandler>;
      };
    }
  >();

  app.use("*", async (c, next) => {
    const db = c.env.DB;

    // 既存Repository
    const activityRepo = newActivityRepository(db);
    const activityLogRepo = newActivityLogRepository(db);

    // LLM設定 (環境変数から取得)
    const llmConfig = {
      apiKey: c.env.OPENROUTER_API_KEY,
      model: c.env.AI_MODEL || "openrouter/anthropic/claude-3.5-haiku",
    };

    // Agent作成
    const agent = createActivityLogAgent(llmConfig);

    // DI
    const uc = newAiUsecase(agent, activityRepo, activityLogRepo, db);
    const h = newAiHandler(uc);

    c.set("h", h);
    return next();
  });

  return app
    .post(
      "/activity-logs/natural",
      zValidator("json", NaturalLanguageActivityLogRequestSchema),
      async (c) => {
        const res = await c.var.h.createActivityLogFromNaturalLanguage(
          c.get("userId"),
          c.req.valid("json"),
        );
        return c.json(res);
      },
    );
}
```

### Usecase層 (`aiUsecase.ts`)

```typescript
import type { UserId, ActivityLog } from "@backend/domain";
import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import type { ActivityRepository } from "../activity";
import type { ActivityLogRepository } from "../activityLog";
import type { ActivityLogAgent } from "./agent";

export type AiUsecase = {
  processNaturalLanguageActivityLog: (
    userId: UserId,
    text: string,
  ) => Promise<{
    activityLog: ActivityLog;
    interpretation: ActivityInterpretation;
  }>;
};

export type ActivityInterpretation = {
  detectedActivity: string;
  detectedQuantity: number;
  confidence: number;
  rawText: string;
};

export function newAiUsecase(
  agent: ActivityLogAgent,
  activityRepo: ActivityRepository,
  activityLogRepo: ActivityLogRepository,
  db: QueryExecutor,
): AiUsecase {
  return {
    processNaturalLanguageActivityLog: processNaturalLanguageActivityLog(
      agent,
      activityRepo,
      activityLogRepo,
      db,
    ),
  };
}
```

### Agent定義 (`agent/activityLogAgent.ts`)

```typescript
import { Agent } from "@mastra/core/agent";
import { findActivityTool, createActivityLogTool } from "../tools";

export type LlmConfig = {
  apiKey: string;
  model: string;
};

export function createActivityLogAgent(config: LlmConfig) {
  return new Agent({
    id: "activity-log-agent",
    name: "Activity Log Agent",
    instructions: `
あなたはユーザーの活動記録を支援するアシスタントです。
ユーザーの自然言語入力から以下を抽出してください:
1. 活動の種類（ランニング、読書、勉強など）
2. 数量または時間（30分、5km、2時間など）
3. 日付（指定がなければ今日）

まず findActivity ツールでユーザーの既存Activity一覧から最適なものを検索し、
次に createActivityLog ツールで記録を作成してください。
該当するActivityが見つからない場合は、最も近いものを提案してください。
`,
    model: config.model,
    tools: {
      findActivity: findActivityTool,
      createActivityLog: createActivityLogTool,
    },
  });
}
```

### Tool定義 (`tools/findActivityTool.ts`)

```typescript
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const findActivityTool = createTool({
  id: "find-activity",
  description: "ユーザーの既存Activity一覧から、入力テキストに最も適したActivityを検索",
  inputSchema: z.object({
    searchText: z.string().describe("検索する活動名"),
  }),
  outputSchema: z.object({
    found: z.boolean(),
    activity: z.object({
      id: z.string(),
      name: z.string(),
      quantityUnit: z.string().nullable(),
    }).optional(),
    suggestions: z.array(z.string()).optional(),
  }),
  execute: async (input, context) => {
    const { searchText } = input;
    const { userId, activityRepo } = context;

    const activities = await activityRepo.getActivitiesByUserId(userId);

    const matchedActivity = activities.find(
      (a) => a.name.toLowerCase().includes(searchText.toLowerCase())
    );

    if (matchedActivity) {
      return { found: true, activity: matchedActivity };
    }

    return {
      found: false,
      suggestions: activities.slice(0, 5).map((a) => a.name),
    };
  },
});
```

---

## 環境変数

```typescript
// apps/backend/config.ts に追加
export const configSchema = z.object({
  // ... 既存の設定

  // AI関連設定
  OPENROUTER_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default("openrouter/anthropic/claude-3.5-haiku"),
  AI_ENABLED: z.coerce.boolean().default(false),
});
```

---

## テスト戦略

| 対象 | アプローチ | 備考 |
|-----|----------|------|
| **Usecase** | Agentをモック | ビジネスロジックのみテスト |
| **Tool** | Repositoryをモック | 決定論的テスト可能 |
| **Agent** | 統合テストのみ | LLM呼び出しが必要 |

---

## 実装順序

1. **Phase 1: 基盤構築**
   - `config.ts`に環境変数追加
   - `lib/mastra/mastraConfig.ts`作成
   - `infra/llm/openRouterProvider.ts`作成

2. **Phase 2: Tool実装**
   - `findActivityTool`実装・テスト
   - `createActivityLogTool`実装・テスト

3. **Phase 3: Agent実装**
   - `activityLogAgent`実装
   - プロンプトチューニング

4. **Phase 4: 統合**
   - Usecase/Handler/Route実装
   - `app.ts`にRoute登録
   - エンドポイント`POST /users/ai/activity-logs/natural`追加

5. **Phase 5: テスト・動作確認**
   - ユニットテスト
   - 統合テスト

---

## 修正対象ファイル

### 新規作成
- `apps/backend/feature/ai/index.ts`
- `apps/backend/feature/ai/aiRoute.ts`
- `apps/backend/feature/ai/aiHandler.ts`
- `apps/backend/feature/ai/aiUsecase.ts`
- `apps/backend/feature/ai/agent/activityLogAgent.ts`
- `apps/backend/feature/ai/agent/index.ts`
- `apps/backend/feature/ai/tools/findActivityTool.ts`
- `apps/backend/feature/ai/tools/createActivityLogTool.ts`
- `apps/backend/feature/ai/tools/index.ts`
- `apps/backend/feature/ai/test/aiUsecase.test.ts`
- `apps/backend/feature/ai/test/tools.test.ts`
- `apps/backend/infra/llm/index.ts`
- `apps/backend/infra/llm/openRouterProvider.ts`
- `apps/backend/lib/mastra/index.ts`
- `apps/backend/lib/mastra/mastraConfig.ts`

### 修正
- `apps/backend/config.ts` - 環境変数追加
- `apps/backend/app.ts` - AI Routeの登録

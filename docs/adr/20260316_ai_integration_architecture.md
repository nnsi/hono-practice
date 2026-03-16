# AI連携機能のアーキテクチャ

## ステータス

決定

## コンテキスト

Actikoに「音声テキスト → ActivityLog自動生成」を皮切りとしたAI連携機能を追加する。将来的にはコーチング等の拡張も見据える。

技術選定の前提:
- LLMプロバイダー: OpenRouter（OpenAI互換API）
- 実行環境: Cloudflare Workers + Hono
- 最初のユースケース: 音声認識テキスト + Activity/ActivityKind一覧 → 適切なActivityLog生成
- エージェント的な自律動作は不要。構造化出力（generateObject）で十分

検討した選択肢:
| 選択肢 | 評価 |
|--------|------|
| Mastra（エージェントフレームワーク） | 過剰。Tool/Agent抽象がユースケースに対して重い |
| Anthropic SDK直接 | OpenRouter経由なので使えない |
| Vercel AI SDK (`ai` + `@ai-sdk/openai`) | OpenRouter互換、generateObject対応、Edge Runtime対応。採用 |

## 決定事項

### 1. ライブラリ: AI SDK + OpenRouter

```
ai + @ai-sdk/openai → createOpenAI({ baseURL: OpenRouter }) → generateObject()
```

ストリーミングchat UIは現時点で不要。`generateObject`でZodスキーマに沿った構造化出力を得る。

### 2. 層の配置

```
infra/ai/
  aiClient.ts              ← AI SDK接続設定のみ（全ドメイン共通）

feature/aiActivityLog/
  aiActivityLogRoute.ts    ← DI・エンドポイント
  aiActivityLogHandler.ts  ← レスポンス検証
  aiActivityLogUsecase.ts  ← コンテキスト組立 → Gateway呼出 → ドメイン型変換
  aiActivityLogGateway.ts  ← generateObject呼出 + レスポンスZodスキーマ
  aiActivityLogPrompt.ts   ← プロンプトテンプレート
  index.ts
  test/
```

### 3. 責務の対応関係

| 既存パターン | AI連携での対応 | 役割 |
|---|---|---|
| `infra/rdb/` (DB接続) | `infra/ai/` (AI SDK接続) | 純技術的な接続設定 |
| Repository (DBクエリ → ドメイン型) | Gateway (AI呼出 → ドメイン型) | 外部サービスの抽象化 |
| Usecase | Usecase | ビジネスロジックのオーケストレーション |
| Route (DI) | Route (DI) | 依存の組み立て |

### 4. ドメイン固有Gatewayを採用（汎用Gatewayではない）

コロケーションの原則に従い、プロンプト・レスポンススキーマ・AI呼出設定をドメインごとに閉じる。

**理由**: 「ActivityLogのAI解析精度を改善したい」とき、触るファイルが `feature/aiActivityLog/` 内で完結する。汎用Gatewayにすると、プロンプトはfeature、呼出設定はinfra、スキーマは別の場所…と変更が散る。

将来コーチング機能を追加する場合は `feature/aiCoaching/` を独立して作る。

### 5. feature/activityLog/ とは分離する

同じActivityLogドメインを扱うが、変更理由が異なるため別ディレクトリとする。

- `feature/activityLog/` の変更契機: CRUD仕様変更、APIスキーマ変更
- `feature/aiActivityLog/` の変更契機: プロンプト改善、モデル切替、パース精度向上

AI機能は既存ActivityLogドメインの**消費者**であり、一部ではない。永続化には既存の `activityLogRepository` をDIで受け取って使う。

```
feature/aiActivityLog/
  └→ uses activityLogRepository  （永続化）
  └→ uses activityRepository     （Activity一覧取得）
  └→ uses aiActivityLogGateway   （AI呼出）

feature/activityLog/
  └→ aiActivityLog のことは知らない
```

### 6. プロンプトはドメインロジック

プロンプトテンプレートは「音声テキストをどう解釈してActivityLogにするか」のビジネスルール。infra層には置かない。feature内の `aiActivityLogPrompt.ts` に配置する。

## 結果

- AI連携の追加が既存コードに影響を与えない（新規featureの追加のみ）
- ドメインごとにプロンプト・スキーマ・Gatewayが閉じるため、独立してチューニング可能
- infra/ai/ は接続設定のみなので、プロバイダー変更時の影響が最小限
- 将来のAI機能追加は `feature/ai{Domain}/` を新設するだけ

## 備考

- 初期実装ではGatewayをモックに差し替えて動作確認する
- フロントの音声認識（Web Speech API / ネイティブ）は別途検討

---
name: scaffold
description: generate-domain.js / generate-feature.js を使ってバックエンドの新ドメイン・新機能を高速にスキャフォールドする。
user_invocable: true
---

# スキャフォールド

新しいドメインモデルやCRUD機能を、既存の実装パターンに準拠した形で一括生成する。

## 使用可能なジェネレーター

| スクリプト | 生成先 | 用途 |
|-----------|--------|------|
| `scripts/generate-domain.js` | `packages/domain/<name>/` | ドメインモデル（ID、Entity、Schema） |
| `scripts/generate-feature.js` | `apps/backend/feature/<name>/` | Route / Handler / Usecase / Repository + テスト |

## 手順

### Step 1: ドメインモデル生成

```bash
node scripts/generate-domain.js <entityName>
```

生成されるファイル:
- `packages/domain/<name>/<name>Schema.ts` — ID (branded type) + Entity (discriminated union) + ファクトリ関数
- `packages/domain/<name>/index.ts` — バレルエクスポート

### Step 2: feature生成

```bash
node scripts/generate-feature.js <entityName>
```

生成されるファイル:
- `feature/<name>/<name>Route.ts` — Hono ルート定義
- `feature/<name>/<name>Handler.ts` — レスポンスバリデーション
- `feature/<name>/<name>Usecase.ts` — ビジネスロジック
- `feature/<name>/<name>Repository.ts` — DB操作（Drizzle ORM）
- `feature/<name>/index.ts` — バレルエクスポート
- `feature/<name>/test/<name>Route.test.ts` — ルートテスト
- `feature/<name>/test/<name>Usecase.test.ts` — ユースケーステスト（TDT形式）

`feature/index.ts` へのエクスポート追記も自動で行われる。

### Step 3: 生成後に手動で行うこと

1. **Drizzleスキーマ追加**: `infra/drizzle/schema.ts` にテーブル定義を追加
2. **DTO追加**: `packages/types/request/` と `packages/types/response/` にリクエスト・レスポンススキーマを追加
3. **ルート登録**: `apps/backend/app.ts` に `.route('/users/<name>s', new<Name>Route)` を追加
4. **マイグレーション**: `pnpm run db-generate && pnpm run db-migrate`
5. **フィールド調整**: Schema・Repository・Usecase の `// TODO` コメント箇所を実際のフィールドに置き換え
6. **TransactionRunner**: 複数テーブルをまたぐ操作が必要な場合のみ、Usecaseに `tx: TransactionRunner` を追加

### Step 4: 確認

```bash
pnpm run tsc       # 型チェック
pnpm run test-once # テスト実行
pnpm run fix       # フォーマット
```

## 生成コードの設計パターン

生成されるコードは以下の既存パターンに準拠している:

- **ドメインID**: `z.string().uuid().brand<"XxxId">()` + `createXxxId(id?: string)` （uuid v7）
- **エンティティ**: `type` フィールドで `"new"` / `"persisted"` の discriminated union
- **ファクトリ関数**: `newXxx()` で依存注入、`createXxxEntity()` でバリデーション付き生成
- **Usecase**: `repo, tracer` を受け取り、全DB操作を `tracer.span()` でラップ
- **Repository**: `<T = any>` ジェネリクス + `withTx(tx)` でトランザクション対応
- **Handler**: レスポンスを Zod スキーマで safeParse してから返す
- **テスト**: Route は `testClient` + `testDB`、Usecase は `ts-mockito` + `noopTracer` のTDT形式

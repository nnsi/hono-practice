# レートリミットをDurable ObjectsからCloudflare Workers KVへ移行

## 背景

WAEの分析で`/auth/token`が平均943msと判明。Durable Objectのコールドスタート（500〜1,000ms）が主因の一つ。
Workers KVに移行してコールドスタートを排除する。

## 変更対象ファイル

### 新規作成
- **`apps/backend/infra/kv/cfKv.ts`**
  - Cloudflare Workers KV用の`KeyValueStore<T>`実装
  - `KVNamespace`のget/put/deleteをラップ
  - TTLは`put`の`expirationTtl`オプションで対応
  - 値はJSON文字列で保存

### 修正
- **`apps/backend/server.cf.ts`**
  - `Env`型: `RATE_LIMIT_DO?: DurableObjectNamespace` → `RATE_LIMIT_KV_NS?: KVNamespace`
  - `newDurableObjectStore` → `newCfKvStore` に差し替え
  - `KeyValueDO`のexportを削除

- **`wrangler.toml`**
  - DOバインディング(`RATE_LIMIT_DO`)とmigrationを削除

- **`.github/workflows/deploy.yml`**
  - stg/productionの動的設定ステップにKV namespaceバインディングを追加
  - GitHub secrets: `KV_RATE_LIMIT_ID_STG`, `KV_RATE_LIMIT_ID_PROD`

### 削除
- **`apps/backend/infra/kv/do.ts`** — DO版アダプター
- **`infra/do/kvs.ts`** — KeyValueDO本体

### 変更不要
- `apps/backend/infra/kv/kv.ts` — KeyValueStore<T>インターフェース
- `apps/backend/middleware/rateLimitMiddleware.ts` — KVStore経由なので影響なし
- `apps/backend/feature/auth/authRoute.ts` — 変更不要
- `apps/backend/context/index.ts` — RATE_LIMIT_KVの型はそのまま
- `apps/backend/server.node.ts` — ローカル開発はRedisのまま

## 検証
1. `npm run tsc` — コンパイルエラーなし
2. `npm run test-once` — 既存テスト全パス
3. `npm run fix` — フォーマット確認

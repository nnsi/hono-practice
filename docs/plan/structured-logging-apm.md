# 構造化ロギング・APM・Tail Worker + WAE 実装計画

## Context

Actikoバックエンドには現在、体系的なロギングや計測の仕組みがない。`console.log` / `console.error` が散発的に使われているのみで、本番環境でのリクエストのトレーシング、パフォーマンスボトルネックの特定、エラーの追跡ができない状態。

`cpa-study-note`プロジェクトで実績のある構造化ロギング + 軽量APM + Tail Worker/WAEパターンをActikoに移植し、ゼロコストのオブザーバビリティ基盤を構築する。

---

## Phase 1: Logger & Tracer ライブラリ

### 1-1. Logger (`apps/backend/lib/logger.ts` 新規作成)

- JSON構造化ログ（`level`, `msg`, `bindings`, `timestamp`）
- ログレベルフィルタリング（debug < info < warn < error）
- `child()` メソッドで feature 名などを付与
- 外部ライブラリ不要（native console使用）

### 1-2. Tracer (`apps/backend/lib/tracer.ts` 新規作成)

**スパンカテゴリ（Actiko向け）:**
| プレフィックス | 対象 | 例 |
|---|---|---|
| `db.*` | PostgreSQL (Hyperdrive) | `db.findActivityById`, `db.createActivityLog` |
| `r2.*` | R2ストレージ | `r2.putObject`, `r2.getSignedUrl` |
| `kv.*` | Durable Object KV | `kv.getRateLimit`, `kv.setRateLimit` |
| `ext.*` | 外部API呼び出し | `ext.googleVerify`, `ext.webhookCall` |

### 1-3. テスト (`apps/backend/lib/tracer.test.ts` 新規作成)

---

## Phase 2: ロガーミドルウェア

### 2-1. loggerMiddleware (`apps/backend/middleware/loggerMiddleware.ts` 新規作成)

- リクエストごとに `requestId`（UUID[:8]）を生成
- `Logger` と `Tracer` をHonoコンテキストに注入
- "Request received" / "Response sent" の自動ログ出力
- ステータスコードに応じたログレベル（500→error, 400→warn, 他→info）
- `tracer.getSummary()` をレスポンスログに含める

### 2-2. AppContext型の拡張 (`apps/backend/context/index.ts` 変更)

Variables に `logger: Logger` と `tracer: Tracer` を追加。

### 2-3. app.ts への適用 (`apps/backend/app.ts` 変更)

CORSミドルウェアの直前（最初のミドルウェア）として `loggerMiddleware()` を追加。

### 2-4. グローバルエラーハンドラ連携 (`apps/backend/lib/honoWithErrorHandling.ts` 変更)

`onError` 内で logger を使ったエラーログ出力を追加。

---

## Phase 3: Feature層へのTracer適用（段階的）

### 3-1. 初期対象

- **activityLog**: `activityLogUsecase.ts` のDB操作を `tracer.span()` でラップ
- **activity**: `activityUsecase.ts` のDB操作をラップ

### 3-2. 後続対象

- auth, task, goal, subscription, apiKey の各feature
- r2ProxyRouteのR2操作（`r2.*` スパン）

---

## Phase 4: Tail Worker + WAE

### 4-1. Tail Worker (`apps/tail-worker/`)

WAEデータポイント構造:
- blobs: level, msg, requestId, method, path, feature, error
- doubles: status, duration, dbMs, r2Ms, kvMs, extMs, spanCount
- indexes: level

### 4-2. wrangler.toml 変更

メインAPIに `tail_consumers` を追加（stg/production）。

---

## Phase 5: WAE クエリ用オペレーションガイド (`docs/ops/apm.md`)

WAE SQL APIを使った分析クエリ集。

---

## 修正対象ファイル一覧

| ファイル | 操作 |
|---|---|
| `apps/backend/lib/logger.ts` | 新規作成 |
| `apps/backend/lib/tracer.ts` | 新規作成 |
| `apps/backend/lib/tracer.test.ts` | 新規作成 |
| `apps/backend/middleware/loggerMiddleware.ts` | 新規作成 |
| `apps/backend/context/index.ts` | 変更 |
| `apps/backend/app.ts` | 変更 |
| `apps/backend/lib/honoWithErrorHandling.ts` | 変更 |
| `apps/tail-worker/src/index.ts` | 新規作成 |
| `apps/tail-worker/wrangler.toml` | 新規作成 |
| `apps/tail-worker/package.json` | 新規作成 |
| `apps/tail-worker/tsconfig.json` | 新規作成 |
| `wrangler.toml` | 変更 |
| `package.json` | 変更 |
| `docs/ops/apm.md` | 新規作成 |

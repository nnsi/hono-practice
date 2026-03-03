# E2E テスト: frontend-v2 Playwright

## Context

E2Eテストが存在しない。`vitest.e2e.config.ts` は準備済みだが `e2e/` ディレクトリがない。
バックエンドはPGliteで完全インメモリ動作可能。Vitest globalSetupでサーバーを立ち上げ、Playwrightでブラウザテストを行う。
ハッピーパスのみ。mobile-v2は後日対応。

## 依存パッケージ追加

```bash
pnpm add -wD playwright
npx playwright install chromium
```

## seed スクリプトのリファクタ

**`scripts/seed-dev-data.ts`** → seedロジックを `seedDevData(db)` 関数として抽出

- 新規: `scripts/seedDevData.ts` — DB インスタンスを受け取る純粋関数に抽出
- 修正: `scripts/seed-dev-data.ts` — `seedDevData` を import して実行するだけのエントリポイントに

seed関数の型は `QueryExecutor`（`apps/backend/infra/rdb/drizzle/drizzleInstance.ts`）を使用。
PGlite drizzle / postgres-js drizzle どちらでも動く。
注意: `scripts/` から `@backend/` alias は使えない。相対パスで import する（`../apps/backend/infra/rdb/drizzle/drizzleInstance`）か、
seed関数のdb引数を `any` にしてE2E globalSetupでPGlite drizzle instanceをそのまま渡す。

加えて、E2Eテスト用に決定論的なユーザーを追加:
- `e2e@example.com` / `password123` — 既知のUUID、既知のアクティビティ1つ

## ファイル構成

```
e2e/
  setup/
    globalSetup.ts     # PGlite + Hono backend + Vite frontend 起動/停止
  helpers/
    browser.ts         # Playwright browser/context/page ライフサイクル
    auth.ts            # ログインヘルパー
  web/
    auth.test.ts       # ログイン・新規登録・ログアウト
    activity.test.ts   # アクティビティ作成・記録
    task.test.ts       # タスク作成・完了トグル
```

## globalSetup.ts の設計

1. PGlite起動 → drizzle + migrate → seedDevData(db)
2. Hono `app` を import し `@hono/node-server` の `serve()` でポート3457で起動
   - `app.fetch(request, { ...testEnv, DB: db })` で env を注入（`server.node.ts` は使わない）
3. Vite `createServer()` でフロントエンドをポート5176で起動
   - `define` で `VITE_API_URL` を `http://localhost:3457` に上書き
4. teardown で vite.close() → server.close() → pglite.close()

env 値（`AppContext["Bindings"]` の全必須プロパティ）:
```typescript
{
  APP_URL: "http://localhost:5176",
  JWT_SECRET: "e2e-test-secret-that-is-at-least-32-chars-long!!",
  JWT_AUDIENCE: "actiko-backend",
  NODE_ENV: "test",
  DATABASE_URL: "unused-pglite-in-memory",
  GOOGLE_OAUTH_CLIENT_ID: "dummy-string",
  STORAGE_TYPE: "local",
  UPLOAD_DIR: "public/uploads",
  DB: db,                    // PGlite drizzle instance
  RATE_LIMIT_KV: undefined,  // レートリミット無効
}
```
型定義は `apps/backend/context/index.ts` の `AppContext` を参照。

## Vite createServer() の注意点

- **`root` の設定が必須**: `root: "./apps/frontend-v2"` を指定しないと `index.html` が見つからず起動しない
- **`server.port` の上書きが必須**: vite.config.ts のデフォルトは 2460。E2Eでは 5176 に上書きする
- `tsconfigPaths({ root: "../.." })` は tsconfig.json の探索起点で、Vite の `root` とは独立。問題ない
- `TanStackRouterVite()` は既に生成済みの `routeTree.gen.ts` を使う。問題ない
- `VitePWA()` は dev サーバーモードでは Service Worker を登録しない。問題ない
- configFileパスは `"./apps/frontend-v2/vite.config.ts"` （repo root相対）

```typescript
// globalSetup.ts での createServer() 呼び出し例
const viteServer = await createServer({
  configFile: "./apps/frontend-v2/vite.config.ts",
  root: "./apps/frontend-v2",  // ← 必須
  server: { port: 5176, host: true },  // ← 2460 を上書き
  define: {
    "import.meta.env.VITE_API_URL": JSON.stringify("http://localhost:3457"),
  },
});
await viteServer.listen();
```

## Cookie SameSite 問題（クロスオリジン認証）

フロントエンド (`localhost:5176`) → バックエンド (`localhost:3457`) はクロスオリジン。
`authRoute.ts` は dev/test 環境で `sameSite` を指定していない（= Chromium デフォルトの Lax）。
Lax では `fetch` の POST リクエストで cookie が送信されない可能性がある。

**対策（いずれか）:**
1. **Vite proxy を使って同一オリジンにする**（推奨）: Vite の `server.proxy` で `/auth`, `/users`, `/user`, `/api`, `/batch` を `http://localhost:3457` にプロキシ。フロントエンドの `VITE_API_URL` を空文字（同一オリジン）にする
2. E2E テスト環境でのみ `sameSite: "None"` を明示（ただし `secure: false` との組み合わせは Chromium で拒否される場合がある）
3. `localhost` 同士なら Chromium が特別扱いすることに賭ける（不安定）

**推奨は方法1**: globalSetup の `createServer()` に proxy 設定を追加:
```typescript
server: {
  port: 5176,
  proxy: {
    "/auth": "http://localhost:3457",
    "/user": "http://localhost:3457",
    "/users": "http://localhost:3457",
    "/api": "http://localhost:3457",
    "/batch": "http://localhost:3457",
  },
},
define: {
  "import.meta.env.VITE_API_URL": JSON.stringify(""),  // 同一オリジン
},
```

## vitest.e2e.config.ts の変更

- `globalSetup: ["./e2e/setup/globalSetup.ts"]` 追加
- `@infra` alias: `viteTsConfigPaths()` プラグインが tsconfig.json の `@infra/*` を自動解決するので、手動追加は不要の可能性が高い。既存ユニットテスト（`test.setup.ts` が `@infra/drizzle/schema` を import）で動作しているので同じメカニズムで動くはず。もし解決されない場合のみ `resolve.alias` に追加する

## テスト内容（ハッピーパスのみ）

### テストユーザーの使い分け
- **`e2e@example.com`**: ログイン、アクティビティ操作、タスク操作に使用。決定論的データ（既知のアクティビティ1つ）
- **`taro@example.com`**: ログインテストでのみ使用可。ランダムシードデータなので表示確認レベル
- **新規登録テスト**: `e2e-register@example.com` 等を使い捨て。登録成功→nav表示を確認するだけ

### auth.test.ts
- ログイン: `e2e@example.com` / `password123` → `nav` 表示を確認
- 新規登録: 「新規登録」タブ → `#register-loginId` に `e2e-register@example.com`、`#register-password` に `password123` → 送信 → `nav` 表示を確認
- ログアウト: `button[aria-label="メニュー"]` → 「ログアウト」ボタン → `#loginId` 表示を確認

### activity.test.ts
- アクティビティ作成: ログイン → 追加ボタン → `input[placeholder*="アクティビティ名"]` に "E2Eテスト活動"、`input[placeholder*="回, 分"]` に "回" → 送信 → グリッドに "E2Eテスト活動" テキスト表示を確認
- アクティビティ記録: e2eユーザーのシード済みアクティビティカードを押下 → ダイアログ（ModalOverlay）表示を確認

### task.test.ts
- タスク作成: ログイン → `a[href="/tasks"]` 押下 → +ボタン → `input[placeholder*="タスク"]` に "E2Eテストタスク" → 送信 → リストに "E2Eテストタスク" 表示を確認

## UIセレクタ（`__root.tsx` から特定済み）

- ログインフォーム: `#loginId`, `#password`, `button[type="submit"]`
- 登録切替: `button` with text "新規登録"
- 登録フォーム: `#register-name`, `#register-loginId`, `#register-password`
- メニュー: `button[aria-label="メニュー"]`
- ログアウト: menu内 `button` with text "ログアウト"
- ナビ: `nav` 要素（認証後に表示）
- タスクページ: `a[href="/tasks"]`

## Playwright ブラウザライフサイクル

- `playwright` パッケージ（`@playwright/test` ではない）を使用。Vitest がテストランナー
- **browser instance**: 各テストファイルの `beforeAll` で `chromium.launch({ headless: true })` → `afterAll` で `browser.close()`
- **browser context**: 各テストの `beforeEach` で `browser.newContext()` → `afterEach` で `context.close()`
- context ごとに Cookie / IndexedDB がリセットされるのでテスト間の状態分離が保証される
- globalSetup とテストプロセスは別プロセス。ポート番号 (5176, 3457) はハードコードで良い
- `e2e/helpers/browser.ts` にこのライフサイクルを `setupBrowser()` 関数として切り出し、各テストファイルから呼ぶ

## テスト間のDB状態管理

- globalSetupでseedは **1回のみ**。テストごとのリセットはしない
- registerテストで新ユーザーが増えるが、他テストに影響しない（各テストは固有ユーザーでログイン）
- もしテスト間の汚染が問題になったら、globalSetup の teardown/setup を `beforeAll` / `afterAll` に変えてDB再作成する

## 重要な参照ファイル

| ファイル | 用途 |
|---------|------|
| `apps/backend/app.ts` | Hono app instance。`app.fetch(req, env)` でenv注入 |
| `apps/backend/context/index.ts` | `AppContext` 型定義。Bindingsの全プロパティ |
| `apps/backend/config.ts` | configSchema（server.node.ts用、E2Eでは使わない） |
| `apps/backend/test.setup.ts` | PGlite + migrate パターンの参照実装 |
| `apps/frontend-v2/src/routes/__root.tsx` | ログイン/登録UI、認証状態分岐、ナビ構造 |
| `apps/frontend-v2/src/utils/apiClient.ts` | `VITE_API_URL` でバックエンドURL決定 |
| `apps/frontend-v2/src/hooks/useAuth.ts` | login/register/logoutのフロー全体 |
| `apps/frontend-v2/vite.config.ts` | Viteプラグイン構成（port 2460） |
| `infra/drizzle/migrations/` | PGlite migrate に渡すフォルダ |
| `infra/drizzle/schema.ts` | 全テーブル定義（seed で使用） |
| `scripts/seed-dev-data.ts` | リファクタ対象のseedスクリプト |

## 検証方法

```bash
npx playwright install chromium  # 初回のみ
pnpm run test-e2e
```

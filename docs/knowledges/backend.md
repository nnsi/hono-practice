# バックエンドの構造について

## パスエイリアス（tsconfig.json）

```ts
"paths": {
  "@backend/*": ["apps/backend/*"],
  "@dtos/*": ["packages/types/*"],
  "@infra/*": ["infra/*"],
  "@packages/domain": ["packages/domain/index.ts"],
  "@packages/domain/*": ["packages/domain/*"],
  "@packages/frontend-shared": ["packages/frontend-shared/index.ts"],
  "@packages/frontend-shared/*": ["packages/frontend-shared/*"],
  "@packages/types": ["packages/types/index.ts"],
  "@packages/sync-engine": ["packages/sync-engine/index.ts"],
  "@packages/sync-engine/*": ["packages/sync-engine/*"],
  "@packages/platform": ["packages/platform/index.ts"],
  "@packages/platform/*": ["packages/platform/*"],
  "@frontend-v2/*": ["apps/frontend-v2/src/*"]
}
```

## アーキテクチャ概要

クリーンアーキテクチャの原則に基づく4層構造:

1. **プレゼンテーション層（Route）**
   - HTTPリクエストの受付とルーティング (Hono)
   - リクエストのバリデーション (`@hono/zod-validator` + `@dtos/request` スキーマ)
   - 依存関係の注入: ミドルウェア内でUsecase/Repositoryをインスタンス化 → `c.set()` でコンテキストに保存
   - レスポンスの返却

2. **アプリケーション層（Handler）**
   - Routeからコンテキスト経由でUsecaseインスタンスを受け取る
   - リクエスト/レスポンスの変換・バリデーション
   - エラーハンドリング

3. **ユースケース層（Usecase）**
   - ファクトリ関数 (`newXXXUsecase`) で依存注入
   - ビジネスロジックの実装
   - ドメインエンティティの操作
   - トランザクション管理

4. **インフラストラクチャ層（Repository）**
   - `newXXXRepository` ファクトリ関数で `QueryExecutor` を受け取る
   - Drizzle ORMによるDB操作
   - ドメインモデルとDBスキーマ間のマッピング

## データフロー

```txt
HTTP Request → Route (DI, Validation) → Handler (Transform) → Usecase (Business Logic) → Repository (DB Query) → Database
```

## APIルート構成（app.ts）

### v1エンドポイント
| パス | 機能 |
|------|------|
| `/auth` | 認証（ログイン、登録、OAuth、トークンリフレッシュ） |
| `/user` | ユーザー情報管理 |
| `/users/activities` | 活動カテゴリーCRUD |
| `/users/activity-logs` | 活動ログCRUD |
| `/users/goals` | 目標設定CRUD |
| `/users/tasks` | タスクCRUD |
| `/users/api-keys` | APIキー管理 |
| `/users/subscription` | サブスクリプション管理 |
| `/r2` | R2画像プロキシ |
| `/api/v1` | レガシーAPIルート |

### v2エンドポイント（同期対応）
| パス | 機能 |
|------|------|
| `/users/v2/activity-logs` | 活動ログ（同期対応） |
| `/users/v2/activities` | 活動（同期対応） |
| `/users/v2/goals` | 目標（同期対応） |
| `/users/v2/tasks` | タスク（同期対応） |

### バッチエンドポイント
| パス | 機能 |
|------|------|
| `POST /batch` | 複数GETリクエストの一括実行（最大5件、`/users/`配下のみ） |

### 認証
- `/users/*` 配下は全て `authMiddleware` で保護
- `/batch` も `authMiddleware` 適用

### CORS設定
- 本番: `APP_URL`、`APP_URL_V2`（任意）
- 開発: localhost:2460（frontend-v2）、8081（mobile-v2 Expo Web）、5176/5177（E2E）等
- ローカルネットワーク: 192.168.x.x, 10.x.x.x 等（開発時のみ）

## ミドルウェア

| ファイル | 役割 |
|---------|------|
| `authMiddleware.ts` | JWT認証 |
| `apiKeyAuth.ts` | APIキー認証 |
| `loggerMiddleware.ts` | リクエスト/レスポンスログ |
| `rateLimitMiddleware.ts` | レート制限（KV使用） |
| `multipartMiddleware.ts` | ファイルアップロード処理 |
| `premiumMiddleware.ts` | サブスクリプション階層チェック |
| `mockAuthMiddleware.ts` | テスト用認証モック |
| `mockPremiumMiddleware.ts` | テスト用サブスクリプションモック |

## クエリサービス（CQRS）

`query/`ディレクトリに読み取り専用のクエリサービスを配置:
- `activityQueryService.ts` - 活動データの読み取り
- `goalQueryService.ts` - 目標データの読み取り

## コンテキスト型（context/index.ts）

```typescript
type AppContext = {
  Variables: {
    jwtPayload: JwtPayload;
    userId: UserId;
    user?: User;
    subscription?: UserSubscription;
    logger: Logger;
    tracer: Tracer;
  };
  Bindings: Config & {
    DB: QueryExecutor;
    R2_BUCKET?: R2Bucket;
    RATE_LIMIT_KV?: KVNamespace;
    WAE_LOGS?: AnalyticsEngineDataset;
  };
};
```

## 設定（config.ts）

環境変数をZodでバリデーション:
- `APP_URL`, `APP_URL_V2`（任意）
- `JWT_SECRET`（最低32文字）, `JWT_AUDIENCE`
- `DATABASE_URL`
- `NODE_ENV`（development/stg/production/test）
- `GOOGLE_OAUTH_CLIENT_ID`
- `STORAGE_TYPE`（local/r2）, `UPLOAD_DIR`
- `REDIS_URL`（任意、レート制限用）
- `API_PORT`（任意）

## サーバー起動

### Cloudflare Workers（本番）: `server.cf.ts`
- Hyperdrive経由でDB接続
- KV（レート制限）、R2（画像）、Analytics Engine（APM）をバインド

### Node.js（ローカル開発）: `server.node.ts`
- Hono node-server使用
- Redis（任意、レート制限用）
- グローバルDrizzleインスタンスキャッシュ（開発時HMR対策）

## 新規機能実装ガイドライン

### 1. 型定義は `type` を使う（`interface` 不可）

```ts
export type TaskUsecase = {
  getTasks: (userId: UserId) => Promise<Task[]>;
};
```

### 2. ファクトリ関数で依存注入

```ts
export function newTaskUsecase(repo: TaskRepository): TaskUsecase {
  return {
    getTasks: getTasks(repo),
  };
}
```

### 3. エラーハンドリングはtry-catchを使わず例外スロー

```ts
if (!task) throw new ResourceNotFoundError("task not found");
```

### 4. Repositoryメソッド名にドメイン名を含める

```ts
export type TaskRepository = {
  getTasksByUserId: (userId: UserId) => Promise<Task[]>;
  createTask: (task: Task) => Promise<Task>;      // × create ではなく ○ createTask
  findTaskById: (id: TaskId) => Promise<Task | null>; // × findById ではなく ○ findTaskById
  withTx: (tx: QueryExecutor) => TaskRepository;
};
```

### 5. feature構成

```txt
feature/
  └─ task/
       ├─ taskRoute.ts
       ├─ taskHandler.ts
       ├─ taskUsecase.ts
       ├─ taskRepository.ts
       ├─ test/
       │   ├─ handler.test.ts
       │   └─ usecase.test.ts
       └─ index.ts
```

v2同期対応エンドポイントは `feature-v2/` に配置:
```txt
feature-v2/
  └─ task/
       ├─ TaskV2Route.ts
       ├─ TaskV2Handler.ts
       ├─ TaskV2Usecase.ts
       └─ TaskV2Repository.ts
```

## テスト

### テストフレームワーク
- **Vitest**: テストランナー
- **ts-mockito**: モッキングライブラリ

### テスト原則
- Arrange-Act-Assert パターン
- テストIDはUUID v4形式: `00000000-0000-4000-8000-00000000000X`
- `beforeEach`で`reset()`を実行
- 非同期処理は`async/await`と`.rejects.toThrow()`

### テスト実行
```bash
pnpm run test-once     # 単体テスト（CIモード）
pnpm run tsc           # 型チェック
pnpm run fix           # フォーマット
pnpm run ci-check      # 全CIチェック
```

## 認証方式

### 1. JWTトークン認証（メインアプリ用）
- Bearer認証: `Authorization: Bearer <access_token>`
- アクセストークン有効期限: 15分
- リフレッシュトークンによる自動更新

### 2. APIキー認証（サードパーティ用）
- ヘッダー認証: `X-API-Key: <api_key>`

### レート制限
- KVベースのレート制限（ミドルウェア層で実装）
- プランに応じた制限値

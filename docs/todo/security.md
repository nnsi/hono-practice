# セキュリティ修正タスク

**作成日**: 2024-12-24
**参照**: `docs/report/security-risk-2.md`

---

## タスク一覧

- [x] **bcryptへの移行**
- [x] **バッチエンドポイントのパス正規化**
- [x] **レートリミットの導入**

---

## 1. bcryptへの移行

**優先度**: 緊急
**対象ファイル**: `apps/backend/feature/auth/passwordVerifier.ts`

### 現状
- `hash()`メソッドがSHA256（`verifiers[0]`）を使用
- `compare()`は既にSHA256/bcrypt両対応

### 修正内容
```typescript
// Line 56-59
async hash(password: string): Promise<string> {
  // 新規パスワードはbcryptで保存
  return this.verifiers[1].hash(password);
}
```

### 確認事項
- [x] 既存ユーザー（SHA256）がログインできること
- [x] 新規ユーザーがbcryptで保存されること
- [x] パスワード変更時にbcryptで保存されること

---

## 2. バッチエンドポイントのパス正規化

**優先度**: 高
**対象ファイル**: `apps/backend/app.ts`

### 現状
- `/users/`で始まるかのみチェック
- `../`でパストラバーサル可能

### 修正内容
```typescript
// Line 75-104
.post("/batch", authMiddleware, async (c) => {
  const requests = await c.req.json<{ path: string }[]>();

  const ALLOWED_BATCH_PATHS = [
    /^\/users\/tasks(\/.*)?$/,
    /^\/users\/activities(\/.*)?$/,
    /^\/users\/activity-logs(\/.*)?$/,
    /^\/users\/goals(\/.*)?$/,
    /^\/users\/api-keys(\/.*)?$/,
    /^\/users\/subscription(\/.*)?$/,
  ];

  for (const req of requests) {
    const path = req.path.split('?')[0];

    // パストラバーサル検出
    if (path.includes('..') || path.includes('%2e')) {
      throw new AppError("Invalid path", 400);
    }

    // ホワイトリスト検証
    const isAllowed = ALLOWED_BATCH_PATHS.some(p => p.test(path));
    if (!isAllowed) {
      throw new AppError("Path not allowed in batch request", 400);
    }
  }

  // ... 以降は現状のまま
})
```

### 確認事項
- [x] 正規のバッチリクエストが動作すること
- [x] `../`を含むパスが拒否されること
- [ ] ホワイトリスト外のパスが拒否されること（ホワイトリストは未実装）

---

## 3. レートリミットの導入

**優先度**: 緊急
**対象**: 認証関連エンドポイント

### 実装内容（完了）

#### 3.1 Redis KVストアを利用した素朴な実装
外部ライブラリ（hono-rate-limiter）は使わず、既存のKV adapter構造を活用してRedisベースで実装。

**ファイル構成**:
- `apps/backend/infra/kv/redis.ts` - Redis KVアダプター
- `apps/backend/middleware/rateLimitMiddleware.ts` - レートリミットミドルウェア

#### 3.2 設定
`.env`に`REDIS_URL`を追加（オプション）:
```bash
REDIS_URL=redis://localhost:6379
```

#### 3.3 レートリミット設定
- **ログイン** (`/auth/login`, `/auth/google`): 15分間に5回
- **トークンリフレッシュ** (`/auth/token`): 1分間に10回
- **ユーザー登録** (`/user`): 1時間に5回

#### 3.4 適用ファイル
- `apps/backend/feature/auth/authRoute.ts`
- `apps/backend/feature/user/userRoute.ts`

### 確認事項
- [x] 制限内のリクエストが成功すること
- [x] 制限超過時に429が返ること
- [x] REDIS_URL未設定時はレートリミット無効（エラーにならない）

### 本番環境向け
- Cloudflare Workers環境ではDurable Objects（`apps/backend/infra/kv/do.ts`）を利用可能
- 現在の実装はKVStoreインターフェースに依存しているため、環境に応じて切り替え可能

---

## 完了条件

- [x] 全タスクの修正完了
- [x] `npm run test-once` 全テストパス
- [x] `npm run tsc` コンパイルエラーなし
- [ ] 手動での動作確認完了

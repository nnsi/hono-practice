# セキュリティ修正タスク

**作成日**: 2024-12-24
**参照**: `docs/report/security-risk-2.md`

---

## タスク一覧

- [ ] **bcryptへの移行**
- [ ] **バッチエンドポイントのパス正規化**
- [ ] **レートリミットの導入**

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
- [ ] 既存ユーザー（SHA256）がログインできること
- [ ] 新規ユーザーがbcryptで保存されること
- [ ] パスワード変更時にbcryptで保存されること

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
- [ ] 正規のバッチリクエストが動作すること
- [ ] `../`を含むパスが拒否されること
- [ ] ホワイトリスト外のパスが拒否されること

---

## 3. レートリミットの導入

**優先度**: 緊急
**対象**: 認証関連エンドポイント

### 修正内容

#### 3.1 パッケージインストール
```bash
npm install hono-rate-limiter
```

#### 3.2 ミドルウェア作成
**新規ファイル**: `apps/backend/middleware/rateLimitMiddleware.ts`

```typescript
import { rateLimiter } from 'hono-rate-limiter';

// ログイン用（厳しめ）
export const loginRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,  // 15分
  limit: 5,                   // 5回まで
  standardHeaders: 'draft-6',
  keyGenerator: (c) => {
    // IPアドレスまたはloginIdでレート制限
    const body = c.req.raw.clone();
    return c.req.header('x-forwarded-for') || 'anonymous';
  },
});

// トークンリフレッシュ用
export const tokenRateLimiter = rateLimiter({
  windowMs: 60 * 1000,  // 1分
  limit: 10,             // 10回まで
  standardHeaders: 'draft-6',
  keyGenerator: (c) => c.req.header('x-forwarded-for') || 'anonymous',
});

// ユーザー登録用
export const registerRateLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000,  // 1時間
  limit: 5,                   // 5回まで
  standardHeaders: 'draft-6',
  keyGenerator: (c) => c.req.header('x-forwarded-for') || 'anonymous',
});
```

#### 3.3 ルートに適用
**対象ファイル**: `apps/backend/feature/auth/authRoute.ts`

```typescript
import { loginRateLimiter, tokenRateLimiter } from '@backend/middleware/rateLimitMiddleware';

// ログインエンドポイント
.post("/login", loginRateLimiter, zValidator("json", loginRequestSchema), async (c) => {
  // ...
})

// トークンリフレッシュ
.post("/token", tokenRateLimiter, async (c) => {
  // ...
})
```

**対象ファイル**: `apps/backend/feature/user/userRoute.ts`

```typescript
import { registerRateLimiter } from '@backend/middleware/rateLimitMiddleware';

// ユーザー登録
.post("/", registerRateLimiter, zValidator("json", createUserRequestSchema), async (c) => {
  // ...
})
```

### 確認事項
- [ ] 制限内のリクエストが成功すること
- [ ] 制限超過時に429が返ること
- [ ] Cloudflare Workers環境で動作すること（メモリストア対応確認）

### 注意
- Cloudflare Workersではメモリストアがリクエスト間で共有されない可能性あり
- 本番環境ではKVやDurable Objectsを使った永続ストアを検討

---

## 完了条件

- [ ] 全タスクの修正完了
- [ ] `npm run test-once` 全テストパス
- [ ] `npm run tsc` コンパイルエラーなし
- [ ] 手動での動作確認完了

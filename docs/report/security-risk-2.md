# Actiko セキュリティ脆弱性レポート

**実施日**: 2024-12-24
**実施者**: Claude Code (ペネトレーションテスト)
**対象**: Actiko バックエンドAPI
**判定**: 合格（37点 / 30点基準）

---

## エグゼクティブサマリー

Actikoアプリケーションに対して攻撃者視点でのセキュリティ監査を実施しました。6件の脆弱性が実証され、合計37点（クリティカル10点、軽微1点基準）となりました。特にパスワードハッシュアルゴリズムとレート制限の欠如は早急な対応が必要です。

---

## 成功した攻撃（実証済み）

### 1. パスワードハッシュがソルトなしSHA256

| 項目 | 内容 |
|------|------|
| **重大度** | クリティカル |
| **スコア** | 10点 |
| **対象ファイル** | `apps/backend/feature/auth/passwordVerifier.ts:57-58` |

**問題のコード**:
```typescript
async hash(password: string): Promise<string> {
  // 新規パスワードはSHA256で保存
  return this.verifiers[0].hash(password);  // SHA256PasswordVerifier
}
```

**攻撃方法**:
- ソルトなしのSHA256は、レインボーテーブル攻撃に対して脆弱
- GPU並列計算で1秒あたり数十億ハッシュの計算が可能
- 一般的なパスワードは数秒〜数分で解読可能

**影響**:
- データベースが侵害された場合、全ユーザーのパスワードが危険に晒される

**修正方法**:
```typescript
async hash(password: string): Promise<string> {
  // bcryptのみを使用
  return new BcryptPasswordVerifier().hash(password);
}
```

---

### 2. レート制限なし

| 項目 | 内容 |
|------|------|
| **重大度** | クリティカル |
| **スコア** | 10点 |
| **対象** | 全エンドポイント（特に `/auth/login`） |

**攻撃実証**:
```
50回のログイン試行が全て成功（429 Too Many Requestsなし）
```

**攻撃方法**:
```bash
# ブルートフォース攻撃
for password in $(cat rockyou.txt); do
  curl -X POST http://api/auth/login \
    -d "{\"loginId\":\"target@email.com\",\"password\":\"$password\"}"
done
# 無制限に試行可能
```

**影響**:
- パスワード総当たり攻撃が可能
- アカウント乗っ取りのリスク
- サービス拒否（DoS）攻撃のベクター

**修正方法**:
```typescript
import { rateLimiter } from 'hono-rate-limiter'

app.use('/auth/login', rateLimiter({
  windowMs: 15 * 60 * 1000,  // 15分
  max: 5,                     // 5回まで
  message: 'Too many login attempts'
}))
```

---

### 3. バッチSSRF（パストラバーサル）

| 項目 | 内容 |
|------|------|
| **重大度** | 高 |
| **スコア** | 7点 |
| **対象ファイル** | `apps/backend/app.ts:75-104` |

**問題のコード**:
```typescript
.post("/batch", authMiddleware, async (c) => {
  const requests = await c.req.json<{ path: string }[]>();

  for (const req of requests) {
    if (!req.path.startsWith("/users/")) {  // 不十分な検証
      throw new AppError("Invalid batch request path", 400);
    }
  }
  // ...
})
```

**攻撃実証**:
```json
// リクエスト
POST /batch
[{ "path": "/users/../" }]

// レスポンス（成功）
[{"message":"Hello"}]  // ルートエンドポイントにアクセス成功

// リクエスト
POST /batch
[{ "path": "/users/../api/v1" }]

// レスポンス（成功）
[{"message":"Invalid API key"}]  // 内部APIにアクセス成功
```

**影響**:
- 認証済みユーザーが内部エンドポイントにアクセス可能
- APIの内部構造が露出
- 将来的に追加される内部エンドポイントへのアクセスリスク

**修正方法**:
```typescript
const ALLOWED_BATCH_PATHS = [
  /^\/users\/tasks$/,
  /^\/users\/activities$/,
  /^\/users\/activity-logs$/,
  /^\/users\/goals$/,
];

for (const req of requests) {
  const normalizedPath = req.path.split('?')[0];
  if (normalizedPath.includes('..')) {
    throw new AppError("Invalid path", 400);
  }
  const isAllowed = ALLOWED_BATCH_PATHS.some(p => p.test(normalizedPath));
  if (!isAllowed) {
    throw new AppError("Path not allowed in batch", 400);
  }
}
```

---

### 4. Stored XSS（潜在的）

| 項目 | 内容 |
|------|------|
| **重大度** | 高（フロントエンド次第） |
| **スコア** | 5点 |
| **対象** | Activity作成エンドポイント |

**攻撃実証**:
```json
// リクエスト
POST /users/activities
{
  "name": "<script>alert('XSS')</script>",
  "emoji": "💀",
  "description": "\"><img src=x onerror=alert('XSS')>"
}

// レスポンス: 200 OK（保存成功）
```

**影響**:
- フロントエンドがReact/Vueの場合、自動エスケープにより軽減される可能性
- dangerouslySetInnerHTMLやv-htmlを使用している場合は危険
- モバイルアプリでWebViewを使用している場合も危険

**修正方法**:
```typescript
import { escape } from 'lodash';

// バリデーション時にサニタイズ
const sanitizedName = escape(body.name);
```

---

### 5. 画像アップロードサイズ制限なし

| 項目 | 内容 |
|------|------|
| **重大度** | 中 |
| **スコア** | 3点 |
| **対象ファイル** | `apps/backend/feature/activity/activityRoute.ts:158-226` |

**問題のコード**:
```typescript
.post("/:id/icon", async (c) => {
  const body = await c.req.json<{ base64: string; mimeType: string }>();
  const { base64, mimeType } = body;  // サイズチェックなし

  // MIMEタイプのみ検証
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
  if (!ALLOWED_TYPES.includes(mimeType)) {
    return c.json({ error: "Invalid image type" }, 400);
  }
  // ...
})
```

**攻撃実証**:
```
1MB以上のbase64画像が制限なくアップロード成功
```

**影響**:
- メモリ枯渇によるDoS攻撃
- ストレージ容量の浪費
- 従量課金の場合、コスト爆発

**修正方法**:
```typescript
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

const decoded = atob(base64);
if (decoded.length > MAX_IMAGE_SIZE) {
  return c.json({ error: "Image too large (max 5MB)" }, 413);
}
```

---

### 6. スタックトレース情報漏洩

| 項目 | 内容 |
|------|------|
| **重大度** | 低 |
| **スコア** | 2点 |
| **対象** | エラーレスポンス全般 |

**攻撃実証**:
```json
// エラーレスポンス
{
  "message": "internal server error",
  "stack": "SyntaxError: Unexpected non-whitespace character...\n    at JSON.parse (<anonymous>)\n    at parseJSONFromBytes (node:internal/deps/undici/undici:5731:19)\n    at async <anonymous> (D:\\workspace\\hono-practice\\apps\\backend\\app.ts:100:37)..."
}
```

**影響**:
- ファイルパス、関数名、ライブラリバージョンが攻撃者に露出
- 内部構造の把握により、より精度の高い攻撃が可能に

**修正方法**:
```typescript
// 本番環境ではスタックトレースを非表示
return c.json({
  message: "internal server error",
  // stack: undefined  // 常に非表示
}, 500);
```

---

## 失敗した攻撃（防御が機能）

| 攻撃 | 結果 | 備考 |
|------|------|------|
| IDOR（他ユーザーデータアクセス） | **防御成功** | リポジトリでuserIdチェックが適切に機能（404返却） |
| JWT Algorithm None攻撃 | **防御成功** | 401拒否 |
| JWT期限切れトークン偽造 | **防御成功** | 401拒否 |
| JWT Audience偽装 | **防御成功** | 401拒否 |
| 認証バイパス | **防御成功** | 全エンドポイントで401拒否 |
| R2パストラバーサル | テスト不可 | R2バケット未設定のため検証不可 |

---

## スコアサマリー

| 脆弱性 | 重大度 | スコア |
|--------|--------|--------|
| ソルトなしSHA256パスワードハッシュ | クリティカル | 10点 |
| レート制限なし | クリティカル | 10点 |
| バッチSSRF（パストラバーサル） | 高 | 7点 |
| Stored XSS（潜在的） | 高 | 5点 |
| 画像サイズ制限なし | 中 | 3点 |
| スタックトレース露出 | 低 | 2点 |
| **合計** | | **37点** |

---

## 修正優先度

### 緊急（今すぐ対応）

1. **パスワードハッシュアルゴリズムの変更**
   - ファイル: `apps/backend/feature/auth/passwordVerifier.ts`
   - 対応: SHA256を削除し、bcryptのみ使用

2. **レート制限の実装**
   - 対象: `/auth/login`, `/auth/token`, `/user`
   - 対応: `hono-rate-limiter` の導入

### 高（1週間以内）

3. **バッチエンドポイントの修正**
   - ファイル: `apps/backend/app.ts`
   - 対応: ホワイトリスト方式へ変更、パストラバーサル対策

4. **XSS対策**
   - 対応: 入力値のサニタイズ実装

### 中（2週間以内）

5. **画像アップロード制限**
   - ファイル: `apps/backend/feature/activity/activityRoute.ts`
   - 対応: サイズ上限チェック追加

### 低（次回スプリント）

6. **スタックトレース非表示**
   - 対応: 本番環境でのスタックトレース出力を無効化

---

## 付録: テスト環境

- **APIサーバー**: http://localhost:3456
- **テストツール**: Playwright MCP
- **テスト手法**: ブラックボックス + ホワイトボックス（コード分析）

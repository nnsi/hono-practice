# セキュリティリスク評価レポート

**評価日**: 2025-12-23
**対象**: Actiko アプリケーション

---

## 概要

本レポートは、Actikoアプリケーションのセキュリティ評価結果をまとめたものです。コード静的解析およびPlaywrightによる動的テストを実施しました。

---

## 確実に攻撃可能な脆弱性

### 1. CORS Origin検証の欠陥

| 項目 | 内容 |
|------|------|
| **重大度** | HIGH |
| **ファイル** | `apps/backend/app.ts:46-48` |
| **CVSS** | 7.5 (High) |

**問題のコード**:
```typescript
const origin = allowedOrigins.some((allowed) =>
  headerOrigin.includes(allowed)  // ← 部分一致で危険！
)
```

**問題点**:
`includes()` は部分一致のため、`APP_URL`が`example.com`の場合、攻撃者は`evil-example.com`からもリクエスト可能。

**攻撃シナリオ**:
1. 攻撃者が `evil-example.com` というドメインを取得
2. 被害者をそのサイトに誘導
3. CORS経由でAPIにリクエストを送信し、ユーザーのデータを窃取

**修正方法**:
```typescript
// 完全一致に変更
const origin = allowedOrigins.some((allowed) =>
  headerOrigin === allowed
)
```

---

## 潜在的な脆弱性（条件付き）

### 2. レート制限なし

| 項目 | 内容 |
|------|------|
| **重大度** | MEDIUM |
| **影響箇所** | 全APIエンドポイント |

**問題点**:
ログイン、トークン更新、API呼び出しにレート制限がない。

**攻撃シナリオ**:
- ブルートフォース攻撃でパスワードを推測
- DoS攻撃でサービスを停止

**修正方法**:
Cloudflare Rate Limiting または Hono のレート制限ミドルウェアを導入。

---

### 3. パスワード複雑度検証なし

| 項目 | 内容 |
|------|------|
| **重大度** | LOW |
| **ファイル** | `packages/types/request/LoginRequest.ts` |

**問題のコード**:
```typescript
password: z.string().min(8, "パスワードは8文字以上")
```

**問題点**:
8文字以上であれば `aaaaaaaa` のような弱いパスワードも許可。

**修正方法**:
```typescript
password: z.string()
  .min(8, "パスワードは8文字以上")
  .regex(/[A-Z]/, "大文字を含めてください")
  .regex(/[a-z]/, "小文字を含めてください")
  .regex(/[0-9]/, "数字を含めてください")
```

---

### 4. /batch エンドポイントのSSRF潜在リスク

| 項目 | 内容 |
|------|------|
| **重大度** | LOW |
| **ファイル** | `apps/backend/app.ts:77-92` |

**問題のコード**:
```typescript
.post("/batch", authMiddleware, async (c) => {
  const requests = await c.req.json<{ path: string }[]>();
  const results = await Promise.all(
    requests.map((req) => app.request(req.path, ...))  // パス検証なし
  );
```

**問題点**:
認証済みユーザーが任意のパスを指定可能。内部エンドポイントへのアクセスに悪用可能性。

**修正方法**:
許可されたパスのホワイトリストを設定し、検証を追加。

---

## 正しく保護されている項目

| 項目 | 結果 |
|------|------|
| 認証なしでの `/users/*` アクセス | 401 Unauthorized（正常） |
| SQLインジェクション | Drizzle ORMで保護 |
| XSS（dangerouslySetInnerHTML） | 使用なし |
| JWT検証 | Audience検証あり |
| パスワードハッシュ化 | bcrypt使用 |
| リフレッシュトークン | SHA256ハッシュ化保存 |
| シークレット管理 | deploy.ymlで環境変数を動的注入 |
| R2ストレージ | 推測困難なキー形式（UUID+timestamp+random） |

---

## 修正優先度

| 優先度 | 脆弱性 | 推奨対応 | 工数目安 |
|--------|--------|----------|----------|
| **P0** | CORS部分一致 | `includes()` → 完全一致に修正 | 30分 |
| **P1** | レート制限 | Cloudflare Rate Limiting導入 | 2時間 |
| **P2** | パスワード複雑度 | 英数字記号混在要件を追加 | 1時間 |

---

## 推奨アクション

### 即座に対応（P0）

1. **CORS設定の修正**
   ```typescript
   // apps/backend/app.ts
   const origin = allowedOrigins.find((allowed) => headerOrigin === allowed);
   ```

### 短期対応（P1）

2. **レート制限の導入**

### 中期対応（P2）

3. **パスワードポリシーの強化**
4. **セキュリティヘッダーの追加**（CSP, HSTS等）

---

## 付録: テスト環境

- **フロントエンド**: http://localhost:5173
- **バックエンドAPI**: http://localhost:3456
- **テストツール**: Playwright MCP

---

*本レポートは2025-12-23時点のコードベースに基づいています。*

# Actiko frontend-v2 セキュリティ統合レポート

**実施日**: 2026-02-24
**対象**: `apps/frontend-v2/src/` + バックエンドAPI (`apps/backend/`)
**手法**: 静的コードレビュー（約80ファイル精査） + 動的ペネトレーションテスト（curl / Playwright CLI、20項目） + Codex CLIレビュー（gpt-5.3-codex、106ファイル精査）

---

## エグゼクティブサマリー

**総合評価: 良好（Critical脆弱性なし）**

ペネトレーションテストで以下の防御を確認済み:
- XSS → Reactの自動エスケープで**実行不可**
- SQLインジェクション → Drizzle ORMパラメータ化クエリで**不可能**
- CORS → 不正オリジン`http://evil.com`からのリクエスト**ブロック**
- パストラバーサル → `..`と`%2e`の両方を**検出・ブロック**
- IDOR → JWTからuserId取得で**パラメータ操作不可**
- 未認証アクセス → 全エンドポイントで**401返却**

改善が必要な8件を以下に記載する。

---

## 修正対象 8件

### 1. バッチエンドポイントにリクエスト数上限を追加

| 項目 | 内容 |
|------|------|
| **検出方法** | ペネトレーションテスト |
| **対象ファイル** | `apps/backend/app.ts` (行92-144) |
| **対象** | backend |

**問題**: 単一HTTPリクエストで数千のサブリクエストを発行可能。Cloudflareのレートリミットは**HTTPリクエスト単位**のため、バッチ経由ではすり抜ける。

**証拠**:
```
1000サブリクエスト → 200 OK (1.1秒, 311KB)
5000サブリクエスト → 200 OK (4.0秒, 1.5MB)
```

**修正内容**: 重複排除込みで配列長上限5件を追加（現状の最大利用数は2件）。
```typescript
if (requests.length > 5) {
  throw new AppError("Too many batch requests (max 5)", 400);
}
```

---

### 2. ログイン時にIndexedDB userIdを検証し、不一致ならクリア

| 項目 | 内容 |
|------|------|
| **検出方法** | コードレビュー |
| **対象ファイル** | `apps/frontend-v2/src/hooks/useAuth.ts` |
| **対象** | frontend-v2 |

**問題**: IndexedDB内のデータにはuserIdが紐づいているが、ログアウト時に`authState`のみ削除され、他テーブル（activityLogs, activities, goals, tasks等）はクリアされない。ユーザーがログアウトせずにブラウザを閉じるケースもあるため、ログアウト時の対策だけでは不十分。

**Codex補足**: Codexレビューで以下の関連問題も指摘された:
- `actiko-v2-lastSyncedAt`（localStorage）がユーザー非依存キーのため、ユーザー切替時に前ユーザーの同期基準時刻が引き継がれる (`initialSync.ts:15,25,91`)
- `useLiveQuery`での取得が`userId`フィルタなし (`useActivities.ts:5`, `useGoals.ts:5`, `useTasks.ts:5`, `useActivityLogs.ts:4`)
- 初回同期で`bulkPut`するだけで前ユーザーの残存レコードを削除しない (`activityRepository.ts:280`, `taskRepository.ts:102`)

**修正内容**: IndexedDBにuserIdを保存し、ログイン時に前回のuserIdと比較。不一致であればDB全体 + `actiko-v2-lastSyncedAt`をクリアしてから初期同期を実行する。

---

### 3. オフライン認証キャッシュの有効期間を1時間に短縮

| 項目 | 内容 |
|------|------|
| **検出方法** | コードレビュー |
| **対象ファイル** | `apps/frontend-v2/src/hooks/useAuth.ts` (行23-36) |
| **対象** | frontend-v2 |

**問題**: 現在24時間のオフライン認証キャッシュ。サーバー側でパスワード変更やアカウント無効化を行っても、最大24時間ローカルアクセスが維持される。

```typescript
if (hoursAgo < 24) {  // ← 24時間は長い
  setUserId(authState.userId);
  setIsLoggedIn(true);
  return true;
}
```

**修正内容**: 有効期間を1時間に短縮。

---

### 4. `secureHeaders()` ミドルウェア追加

| 項目 | 内容 |
|------|------|
| **検出方法** | ペネトレーションテスト |
| **対象ファイル** | `apps/backend/app.ts` |
| **対象** | backend |

**問題**: 以下のセキュリティヘッダーが全て未設定:

| ヘッダー | 用途 |
|---------|------|
| X-Frame-Options | クリックジャッキング防止 |
| Content-Security-Policy | XSS等の防止 |
| X-Content-Type-Options | MIMEスニッフィング防止 |
| Strict-Transport-Security | HTTPS強制 |

**修正内容**:
```typescript
import { secureHeaders } from 'hono/secure-headers'
app.use('*', secureHeaders())
```

---

### 5. Zodスキーマに文字列長max制限を追加

| 項目 | 内容 |
|------|------|
| **検出方法** | ペネトレーションテスト |
| **対象ファイル** | `packages/types/request/` 配下の各スキーマ |
| **対象** | packages/types |

**問題**: 文字列フィールドに`.max()`が未設定。10000文字のアクティビティ名が受け入れられた。

**修正内容**: 各フィールドに適切なmax制限を追加（例: name → `.max(100)`）。

---

### 6. localStorage値のZodバリデーション + vite sourcemap:false

| 項目 | 内容 |
|------|------|
| **検出方法** | コードレビュー |
| **対象ファイル** | `apps/frontend-v2/src/components/setting/SettingsPage.tsx`, `apps/frontend-v2/vite.config.ts` |
| **対象** | frontend-v2 |

**問題A**: `JSON.parse`後に`as`キャストのみでランタイムバリデーションなし。
```typescript
return JSON.parse(stored) as AppSettings; // 型キャストのみ
```

**問題B**: `vite.config.ts`の`build`に`sourcemap`設定が明示されていない。

**修正内容**:
- localStorage読み取り箇所にZodスキーマによるランタイムバリデーションを追加
- `vite.config.ts`の`build`に`sourcemap: false`を明示

---

### 7. APIキー一覧のマスク表示

| 項目 | 内容 |
|------|------|
| **検出方法** | Codex CLIレビュー |
| **対象ファイル** | `apps/frontend-v2/src/components/setting/ApiKeyList.tsx` (行83-84), `CreateApiKeyDialog.tsx` (行28,64) |
| **対象** | frontend-v2 + backend |

**問題**: APIキー一覧画面でキー値が平文表示されている。画面共有・肩越し・録画時に漏洩リスクあり。作成直後の表示は妥当だが、一覧では不要。

**修正内容**:
- フロントエンド: 一覧画面で `xxxx...last4` のマスク表示に変更
- バックエンド: 一覧APIからは平文キーを返さない設計に変更（作成時レスポンスのみ平文返却）

---

### 8. 数値入力で `NaN/Infinity` が通り得る

| 項目 | 内容 |
|------|------|
| **検出方法** | Codex CLIレビュー |
| **対象ファイル** | `useLogForm.ts:61`, `useEditLogDialog.ts:30`, `useCreateGoalDialog.ts:33,46`, `EditGoalForm.tsx:27,32` |
| **対象** | frontend-v2 |

**問題**: `Number(...)` の結果をそのまま保存しており、`NaN` や `Infinity` が IndexedDB に入り得る。目標作成は `<= 0` 判定のみで `NaN` を弾けない（`NaN <= 0` は `false`）。

**修正内容**: 数値変換箇所に `Number.isFinite()` チェックを追加。

---

## 防御されていることが確認された項目

ペネトレーションテストで以下の攻撃が全て**失敗**（= 正しく防御されている）:

| 攻撃 | 防御機構 | 結果 |
|------|---------|------|
| XSS（ブラウザ実行） | Reactの自動エスケープ | `<script>`タグがテキストとして表示 |
| SQLインジェクション | Drizzle ORMパラメータ化クエリ | 全ペイロード無害化 |
| 未認証APIアクセス | JWT認証ミドルウェア | 全エンドポイントで401 |
| 不正JWTトークン | HS256 + audience検証 | 正しく拒否 |
| CORS不正オリジン | 動的CORS設定 | `http://evil.com`ブロック |
| パストラバーサル | `..`と`%2e`の両方を検出 | 全パターンブロック |
| IDOR（他ユーザーデータ） | JWTからuserId取得 | パラメータ操作不可 |
| 不正Content-Type | Zodバリデーション | 正しく拒否 |
| 偽造refreshトークン | Cookie署名検証 | 正しく拒否 |
| ヘッダーインジェクション | env経由のユーザーID取得 | 注入不可 |

## 対策不要と判断した項目（参考）

| 項目 | 判断理由 |
|------|---------|
| APIレートリミット（開発環境） | 開発環境のみの問題。本番はCloudflare KV + WAFで対策 |
| エラーレスポンスのスタックトレース | `NODE_ENV !== "production"` ガード済み。開発環境のみ |
| CSVインジェクション | 自分がインポートしたデータを自分がエクスポートするだけ |
| CSVファイルサイズ上限 | ユーザー自身のブラウザへの影響のみ。サーバー実害なし |
| 画像タイプのクライアント検証 | バックエンドでマジックバイト検証済み |
| XSSペイロードのDB保存 | Reactの自動エスケープで実行不可 |
| JWTのlocalStorage保存 | コード上保存箇所なし（ペネトレーションテストの誤検出の可能性大） |
| ログインフォームのバリデーション | サーバー側で認証検証済み。実害なし |
| CSVインジェクション（Codexも指摘） | 自分がインポート→自分がエクスポートのフローのみ。攻撃シナリオ不成立 |
| CSV/画像のサイズ・MIME検証（Codexも指摘） | クライアント側DoSのみ。バックエンドはマジックバイト検証済み |
| CSRF境界のURL部分一致依存（Codex指摘） | 現状は正しく動作。将来のルート変更時に注意 |
| Vite `host: true`（Codex指摘） | 開発環境限定 |

---

## レビューソース

| ソース | モデル/ツール | 所要時間 | トークン消費 |
|--------|-------------|---------|-------------|
| サブエージェント（コードレビュー） | Claude Opus 4.6 | 約4分 | 134k |
| サブエージェント（ペネトレーションテスト） | Claude Opus 4.6 | 約12分 | 89k |
| Codex CLI | gpt-5.3-codex | 約5分 | 289k |

*Generated by automated security review + penetration testing + Codex CLI pipeline*

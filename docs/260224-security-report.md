# Actiko frontend-v2 セキュリティ統合レポート

**実施日**: 2026-02-24
**対象**: `apps/frontend-v2/src/` + バックエンドAPI (`apps/backend/`)
**手法**: 静的コードレビュー + 動的ペネトレーションテスト（curl / Playwright CLI）

---

## エグゼクティブサマリー

frontend-v2に対して**コードレビュー**（約80ファイル精査）と**実攻撃テスト**（20項目）の2軸で包括的セキュリティ評価を実施した。

**総合評価: 良好（Critical脆弱性なし）**

- Reactの自動エスケープにより**XSSは実行不可**（ペネトレーションテストで確認済み）
- Drizzle ORMのパラメータ化クエリにより**SQLインジェクションは不可能**
- CORS設定が正しく機能し、**不正オリジンからのリクエストはブロック**
- パストラバーサル防御が`..`と`%2e`の両方をカバー

ただし、バッチエンドポイントのDoS耐性、セキュリティヘッダー未設定、認証キャッシュ設計など**改善すべき項目が複数**発見された。

---

## 発見事項サマリー

| 深刻度 | 件数 | 内訳 |
|--------|------|------|
| Critical | 0 | - |
| High | 4 | バッチDoS, レートリミット不足, 認証キャッシュのデータ分離, オフライン認証24h |
| Medium | 5 | セキュリティヘッダー未設定, スタックトレース漏洩, CSVインジェクション, CSVサイズ無制限, 画像タイプ検証不足 |
| Low | 6 | XSSペイロードDB保存, 文字列長制限なし, JWTのlocalStorage保存, localStorage型検証不足, ソースマップ設定, ログイン入力バリデーション |

---

## High - 早急に修正が必要

### H-1. バッチエンドポイントにリクエスト数制限なし（DoS）

| 項目 | 内容 |
|------|------|
| **検出方法** | ペネトレーションテスト |
| **対象ファイル** | `apps/backend/app.ts` (行92-144) |
| **深刻度** | High |

**証拠**: 実攻撃で確認
```
1000リクエスト → 200 OK (1.1秒, 311KB)
5000リクエスト → 200 OK (4.0秒, 1.5MB)
```

単一HTTPリクエストで数千のサブリクエストを発行可能。サーバーリソースを過大に消費するDoS攻撃が成立する。

**推奨修正**: バッチ配列にmax制限を追加
```typescript
if (requests.length > 20) {
  throw new AppError("Too many batch requests (max 20)", 400);
}
```

---

### H-2. APIエンドポイント全般にレートリミットなし

| 項目 | 内容 |
|------|------|
| **検出方法** | ペネトレーションテスト |
| **対象ファイル** | `apps/backend/feature/auth/authRoute.ts` (行61-69) |
| **深刻度** | High |

**証拠**: 実攻撃で確認
```
ログイン7回連続試行 → 全てHTTP 401（レートリミットなし）
100並列API呼び出し → 全てHTTP 200（297msで完了）
```

レートリミットは`RATE_LIMIT_KV`依存で、KV未設定時は完全に無効。開発環境ではブルートフォース攻撃が可能。本番環境でもKV設定漏れがあれば同様。

**推奨修正**:
- 開発環境でもインメモリのレートリミットを実装
- 書き込み系エンドポイント（POST/PUT/DELETE）にもレートリミットを適用

---

### H-3. ログアウト時にIndexedDBのユーザーデータが残存

| 項目 | 内容 |
|------|------|
| **検出方法** | コードレビュー |
| **対象ファイル** | `apps/frontend-v2/src/hooks/useAuth.ts` (行125-132) |
| **深刻度** | High |

ログアウト時に`authState`のみ削除され、activityLogs, activities, goals, tasks等のデータがIndexedDBに残存する。共有端末で別ユーザーがログインした場合、前ユーザーのデータが閲覧・同期される可能性がある。

```typescript
// 現状: authStateのみ削除
const logout = useCallback(() => {
  apiClient.auth.logout.$post().catch(() => {});
  clearToken();
  setIsLoggedIn(false);
  setUserId(null);
  db.authState.delete("current"); // ← 他テーブルは残存
}, []);
```

**推奨修正**: ログアウト時に`db.delete()`でDB全体をクリアし、`window.location.reload()`で状態リセット。

---

### H-4. オフライン認証キャッシュの24時間有効期間が長い

| 項目 | 内容 |
|------|------|
| **検出方法** | コードレビュー |
| **対象ファイル** | `apps/frontend-v2/src/hooks/useAuth.ts` (行23-36) |
| **深刻度** | High |

サーバー側でパスワード変更やアカウント無効化を行っても、攻撃者がオフラインで最大24時間アクセスを維持可能。

```typescript
if (hoursAgo < 24) {  // ← 24時間は長い
  setUserId(authState.userId);
  setIsLoggedIn(true);
  return true;
}
```

**推奨修正**: 有効期間を4-8時間に短縮。バックグラウンドのサーバー認証失敗時に即ログアウトする処理を追加。

---

## Medium - 計画的に修正が必要

### M-1. セキュリティヘッダー未設定

| 項目 | 内容 |
|------|------|
| **検出方法** | ペネトレーションテスト |
| **深刻度** | Medium |

以下のヘッダーが全て未設定:

| ヘッダー | 用途 |
|---------|------|
| X-Frame-Options | クリックジャッキング防止 |
| Content-Security-Policy | XSS等の防止 |
| X-Content-Type-Options | MIMEスニッフィング防止 |
| Strict-Transport-Security | HTTPS強制 |

**推奨修正**:
```typescript
import { secureHeaders } from 'hono/secure-headers'
app.use('*', secureHeaders())
```

---

### M-2. エラーレスポンスにスタックトレース漏洩

| 項目 | 内容 |
|------|------|
| **検出方法** | ペネトレーションテスト |
| **対象ファイル** | `apps/backend/lib/honoWithErrorHandling.ts` (行43-49) |
| **深刻度** | Medium |

**証拠**:
```json
{
  "message": "internal server error",
  "stack": "SyntaxError: No number after minus sign...\n    at D:\\workspace\\hono-practice\\node_modules..."
}
```

ファイルパス、ライブラリバージョン、内部構造が漏洩。`NODE_ENV`設定ミスで本番でも発生しうる。

**推奨修正**: バッチエンドポイントの入力をZodで厳密にバリデーション。本番デプロイ時の`NODE_ENV`確認チェック追加。

---

### M-3. CSVエクスポートにおけるCSVインジェクション未対策

| 項目 | 内容 |
|------|------|
| **検出方法** | コードレビュー |
| **対象ファイル** | `apps/frontend-v2/src/components/csv/CSVImportPreview.tsx` (行68-98) |
| **深刻度** | Medium |

CSVエクスポート時に`=`, `+`, `-`, `@`で始まるセル値がそのまま出力される。Excelで開くと数式インジェクションが実行される可能性。

**推奨修正**: 先頭が危険文字の場合にシングルクォート`'`を付与。

---

### M-4. CSVファイルサイズの上限チェックなし

| 項目 | 内容 |
|------|------|
| **検出方法** | コードレビュー |
| **対象ファイル** | `apps/frontend-v2/src/hooks/useCSVImport.ts` (行149-159) |
| **深刻度** | Medium |

巨大CSVファイル（数百MB）でブラウザメモリ枯渇のDoS状態になりうる。

**推奨修正**: ファイル選択時に10MB上限チェックを追加。

---

### M-5. 画像アップロードのクライアント側タイプ検証がaccept属性のみ

| 項目 | 内容 |
|------|------|
| **検出方法** | コードレビュー |
| **対象ファイル** | `apps/frontend-v2/src/components/actiko/IconTypeSelector.tsx` (行169-176) |
| **深刻度** | Medium |

HTML `accept`属性のみに依存。ただしバックエンド側ではマジックバイト検証（JPEG, PNG, GIF, WebP）が実装済みのため、実害は限定的。

**推奨修正**: クライアント側でも`file.type`と`file.size`の検証を追加。

---

## Low / Informational

### L-1. APIがXSSペイロードをサニタイズせずDB保存

| 項目 | 内容 |
|------|------|
| **検出方法** | ペネトレーションテスト |
| **深刻度** | Low（現時点） |

**証拠**: `<script>alert('XSS')</script>` をアクティビティ名に保存成功。Reactの自動エスケープにより**実行は防御されている**が、将来`dangerouslySetInnerHTML`を使用した場合やReact外でデータ利用する場合にリスクが顕在化する。

---

### L-2. Zodスキーマに文字列長制限なし

| 項目 | 内容 |
|------|------|
| **検出方法** | ペネトレーションテスト |
| **対象ファイル** | `packages/types/request/CreateActivityRequest.ts` |
| **深刻度** | Low |

10000文字のアクティビティ名が受け入れられた。`.max(200)`等の追加を推奨。

---

### L-3. アクセストークンのlocalStorage保存

| 項目 | 内容 |
|------|------|
| **検出方法** | ペネトレーションテスト |
| **深刻度** | Low |

`localStorage.getItem('actiko-v2-token')` でJWTが取得可能。XSS発生時にトークン窃取リスク。コードレビューではメモリ保持の実装（`apiClient.ts`）が確認されたため、localStorageへの保存はPWA/Service Worker経由の可能性がある。

**注**: コードレビューでは`apiClient.ts`がメモリ変数で保持していることが確認されたが、ペネトレーションテストではlocalStorageにトークンが存在した。保存経路の調査を推奨。

---

### L-4. localStorage値のランタイム型検証不足

| 項目 | 内容 |
|------|------|
| **検出方法** | コードレビュー |
| **対象ファイル** | `apps/frontend-v2/src/components/setting/SettingsPage.tsx` (行16-26) |
| **深刻度** | Low |

`JSON.parse`後に`as`キャストのみでランタイムバリデーションなし。XSS経由のlocalStorage汚染で挙動が不安定になる可能性。

---

### L-5. ソースマップの生成設定が明示されていない

| 項目 | 内容 |
|------|------|
| **検出方法** | コードレビュー |
| **対象ファイル** | `apps/frontend-v2/vite.config.ts` |
| **深刻度** | Low |

Viteデフォルトではプロダクションビルドでソースマップは生成されないが、明示的に`sourcemap: false`を設定しておくとより安全。

---

### L-6. ログインフォームのクライアント側バリデーション不足

| 項目 | 内容 |
|------|------|
| **検出方法** | コードレビュー |
| **対象ファイル** | `apps/frontend-v2/src/components/root/LoginForm.tsx` |
| **深刻度** | Low |

ログインフォームにJS側の空欄チェックがない（HTML `required`のみ）。不要なAPI呼び出しを防ぐためJS側バリデーション追加を推奨。

---

## 防御されていることが確認された項目

ペネトレーションテストで以下の攻撃が全て**失敗**（= 正しく防御されている）ことを確認:

| 攻撃 | 防御機構 | 結果 |
|------|---------|------|
| XSS（ブラウザ実行） | Reactの自動エスケープ | `<script>`タグがテキストとして表示 |
| SQLインジェクション | Drizzle ORMパラメータ化クエリ | 全ペイロード無害化 |
| 未認証APIアクセス | JWT認証ミドルウェア | 全エンドポイントで401 |
| 不正JWTトークン | HS256 + audience検証 | 正しく拒否 |
| CORS不正オリジン | 動的CORS設定 | `http://evil.com`からのリクエストブロック |
| パストラバーサル | `..`と`%2e`の両方を検出 | 全パターンブロック |
| IDOR（他ユーザーデータ） | JWTからuserId取得 | パラメータ操作不可 |
| 不正Content-Type | Zodバリデーション | 正しく拒否 |
| 偽造refreshトークン | Cookie署名検証 | 正しく拒否 |
| ヘッダーインジェクション | env経由のユーザーID取得 | 注入不可 |

---

## 良好な実装（ポジティブフィードバック）

1. **XSS完全防御**: `dangerouslySetInnerHTML`, `innerHTML`, `eval`の使用がコードベース全体で**ゼロ**。全ユーザー入力がReact JSXで自動エスケープ
2. **CSRF対策**: 認証系のみ`credentials: "include"`、通常APIは`credentials: "omit"`の適切な使い分け
3. **トークンリフレッシュ排他制御**: `refreshPromise`パターンで401同時発生時の重複リフレッシュを防止
4. **UUID v7使用**: 推測困難かつ時系列ソート可能なID生成
5. **ソフトデリートパターン**: `deletedAt`による安全なデータ削除
6. **画像リサイズ**: 100KB以下への自動圧縮でストレージ濫用を防止
7. **同期エンジン**: 排他制御 + 指数バックオフ（最大5分）で無限リトライ防止
8. **confirm()/alert()不使用**: インライン2段階確認UIでフィッシング耐性向上
9. **バックエンド画像検証**: マジックバイト検証でContent-Type偽装を防御
10. **パストラバーサル防御**: URLエンコード（`%2e`）含む全パターンをカバー

---

## 修正優先度マトリクス

| 優先度 | 項目 | 対策コスト | 対象 |
|--------|------|-----------|------|
| **P1** | H-1. バッチDoS制限 | 低（数行） | backend |
| **P1** | H-2. レートリミット拡充 | 中 | backend |
| **P1** | H-3. ログアウト時DB全クリア | 低（数行） | frontend-v2 |
| **P2** | H-4. オフライン認証期間短縮 | 低 | frontend-v2 |
| **P2** | M-1. セキュリティヘッダー追加 | 低（1行） | backend |
| **P2** | M-2. スタックトレース漏洩防止 | 低 | backend |
| **P3** | M-3. CSVインジェクション対策 | 低 | frontend-v2 |
| **P3** | M-4. CSVサイズ制限 | 低 | frontend-v2 |
| **P3** | M-5. 画像タイプ検証強化 | 低 | frontend-v2 |
| **P4** | L-1. XSSペイロードサニタイズ | 中 | backend |
| **P4** | L-2. Zodスキーマmax追加 | 低 | packages/types |
| **P4** | L-3. トークン保存方法調査 | 中 | frontend-v2 |
| **P4** | L-4. localStorage型検証 | 低 | frontend-v2 |
| **P4** | L-5. ソースマップ明示的無効化 | 低 | frontend-v2 |
| **P4** | L-6. ログインバリデーション追加 | 低 | frontend-v2 |

---

*Generated by automated security review + penetration testing pipeline*

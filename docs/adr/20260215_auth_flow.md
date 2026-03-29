# 認証フロー

## 概要

JWT形式のアクセストークンとリフレッシュトークンを組み合わせた認証方式を採用。
Google OAuth認証もサポート。frontendではオフライン認証にも対応。

### トークンの仕様

- アクセストークン
  - 形式: JWT
  - 有効期限: 15分
  - 保存場所: メモリ（frontend）/ Expo Secure Store（mobile）
  - 用途: APIリクエスト時の認証
  - 送信方法: Authorizationヘッダー（Bearer トークン）

- リフレッシュトークン
  - 形式: ランダム文字列
  - 有効期限: 1ヶ月
  - 保存場所: httpOnlyクッキー（Web）/ Expo Secure Store（モバイル）
  - 用途: アクセストークンの更新

## 認証フロー詳細

### 1. 起動時の認証状態確認（オフラインファースト）

frontendでは2段階の認証チェックを行う:

**Step 1: オフライン認証（即座に完了）**
1. Dexieの`authState`テーブルから`lastLoginAt`を取得
2. 最終ログインが1時間以内 → オフライン認証OK
3. UIを即座に表示（ローカルDBのデータで動作可能）

**Step 2: サーバー同期（バックグラウンド）**
4. `/auth/token`エンドポイントにリフレッシュリクエスト送信
5. 成功: 新しいアクセストークン取得 + ユーザー情報取得
6. ユーザーIDが前回と異なる場合 → ローカルデータをクリア → 初回同期実行
7. 失敗: ネットワークエラー等 → オフラインモードで継続

**オフライン認証が無効の場合**
- サーバー認証を待機 → 成功/失敗後にローディング解除
- ネットワーク不通 → ログイン画面を表示

### 2. ログイン（通常認証）

1. ユーザーがログインID/パスワードを入力
2. `/auth/login`エンドポイントに認証リクエスト送信
3. 認証成功時:
   - アクセストークンをレスポンスで受け取り、メモリに保存
   - リフレッシュトークンはhttpOnlyクッキーとして自動設定
4. `/user/me`でユーザー情報を取得
5. ユーザー切替検知: 前回と異なるユーザーIDの場合、ローカルデータをクリア
6. `performInitialSync(userId)` で初回同期実行

### 3. ログイン（Google OAuth認証）

1. ユーザーがGoogleログインボタンをクリック
2. Google OAuth認証フローを開始（Web: Google Sign-In、モバイル: expo-auth-session）
3. 認証コード/クレデンシャルを取得
4. `/auth/google`エンドポイントにクレデンシャルを送信
5. バックエンドでGoogleトークンを検証、ユーザー情報取得
6. 新規ユーザー → `user`テーブル作成 + `user_provider`に関連付け
7. 以降は通常ログインと同様（トークン発行 → 初回同期）

### 4. APIリクエスト時の認証処理

1. `@packages/sync-engine`の`createAuthenticatedFetch()`がアクセストークンを自動付与
   - `Authorization: Bearer {token}`
2. バックエンドの`authMiddleware`でJWT検証
3. 検証失敗（401）→ クライアント側でトークンリフレッシュ

### 5. APIキー認証（サードパーティ用）

- ヘッダー: `X-API-Key: <api_key>`
- `apiKeyAuth`ミドルウェアでキーを検証
- JWTの代わりにAPIキーで認証（設定画面から生成・管理）

### 6. ログアウト

1. `/auth/logout`にリクエスト送信（fire-and-forget）
2. メモリからアクセストークンをクリア
3. `authState`テーブルの`lastLoginAt`を空文字に更新
   - **注意**: `userId`は保持する（削除するとユーザー切替検知ができなくなり、前ユーザーのデータが残る問題が発生する）
4. UIをログイン画面に遷移

## ユーザー切替保護

別アカウントでログインした際のデータ汚染を防止:

1. ログイン時に`authState.userId`と新しいユーザーIDを比較
2. 異なる場合 → `clearLocalData()`でローカルDBを全クリア
3. その後`performInitialSync(newUserId)`で新ユーザーのデータを取得

## トークンローテーション

### ローテーション方式

リフレッシュトークンは**セレクタパターン**を採用:
- トークン = `selector.plainToken`（selector: 検索用公開値、plainToken: 秘密値）
- DBにはselectorとplainTokenのSHA256ハッシュを保存
- 検索はselectorインデックス経由、検証はハッシュ比較（タイミングアタック耐性）

`POST /auth/token` でのローテーションフロー:
1. selectorでDB検索 → ハッシュ検証 → revoked/expired チェック
2. 新しいトークンペア生成 + JWT発行
3. 旧トークン失効（`revokedAt` 設定）と新トークン作成を `Promise.all` で並列実行
4. DB書き込みは `waitUntil` で fire-and-forget（レスポンスをブロックしない）

### 並行リフレッシュリクエストの対策

**サーバー側にgrace period（replay window）は設けない。クライアント側のmutexで多重リクエストを防止する。**

理由:
- サーバー側grace periodは攻撃面を広げる（窃取されたトークンが猶予期間中にreplay可能）
- 現状の設計では `fetchRefreshToken`（検証）→ `rotateRefreshToken`（生成+失効）が同一リクエスト内で完結し、攻撃者がこの隙間に割り込んでも旧トークンは即座に失効される
- 多重リクエストの発生源（タブ復帰、ネットワークリトライ等）はクライアント責務として制御すべき

クライアント側実装（Web / Mobile 共通パターン）:
```typescript
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise; // 2つ目以降は同じPromiseを共有
  refreshPromise = (async () => { /* refresh処理 */ })();
  return refreshPromise;
}
```

- Web: `packages/sync-engine/http/authenticatedFetch.ts`
- Mobile: `apps/mobile/src/utils/apiClient.ts`
- テスト: "concurrent 401s share a single token refresh (mutex)" で検証済み

## セキュリティ対策

1. **トークンの保存**
   - アクセストークン: メモリ内管理（XSS被害最小化）
   - リフレッシュトークン: httpOnlyクッキー（JSからアクセス不可）
   - SameSite属性: Strict（CSRF防止）
   - Secure属性: 本番環境でHTTPS通信のみ

2. **APIリクエスト**
   - HTTPS必須（本番環境）
   - CORS設定で許可オリジンのみアクセス可能

3. **トークンの無効化**
   - ログアウト時にサーバー側でリフレッシュトークンを無効化
   - クッキー削除（Max-Age=0）
   - リフレッシュトークンはDBで管理し、revoked_atで無効化可能

4. **Google OAuth**
   - 認証コードの検証はバックエンドで実施
   - プロバイダーIDとユーザーIDの関連付けを`user_provider`テーブルで管理

## エラーハンドリング

1. **アクセストークン期限切れ**: リフレッシュトークンで自動更新
2. **リフレッシュトークン期限切れ**: ログイン画面にリダイレクト
3. **ネットワーク不通**: オフラインモードで継続（ローカルDBのデータを表示）
4. **ユーザー切替時**: ローカルデータクリア → 新規初回同期

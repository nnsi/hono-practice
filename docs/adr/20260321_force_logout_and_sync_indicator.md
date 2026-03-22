# モバイル: リフレッシュトークン失敗時の強制ログアウト + Syncインジケーター

## ステータス

決定

## コンテキスト

### 問題1: リフレッシュトークン失敗時にセッションが残り続ける

`refreshAccessToken()` が失敗した場合、ステータスコードに関係なく一律 `return null` していた。これにより:

- 400/401/403（トークン無効・期限切れ・revoke済み）でもログイン状態が維持される
- sync が 30 秒ごとに静かに失敗し続ける（ユーザーに通知なし）
- ローカルで作成したデータが永久に同期されないまま残る

### 問題2: モバイルにSyncインジケーターがない

Web 版の `LogCard` には `_syncStatus === "pending"` 時にスピナー+amber背景の表示があるが、モバイルには未実装だった。ユーザーはデータが同期されているかどうかを判別できない状態だった。

## 決定事項

### 1. リフレッシュトークン失敗時のエラー分類

`refreshAccessToken()` でレスポンスのステータスコードを分類する:

| ステータス | 分類 | 動作 |
|-----------|------|------|
| 400/401/403 等 (< 500) | 回復不能 | refreshToken 削除 + `onAuthExpired` コールバック発火 → 強制ログアウト |
| 500 系 | サーバー一時障害 | `return null`（既存の exponential backoff リトライに任せる） |
| ネットワークエラー/タイムアウト | 一時障害 | `return null`（catch 節、同上） |

### 2. 強制ログアウトの仕組み

**Mobile:**
- `apiClient.ts` に `setOnAuthExpired(callback)` を追加
- `useAuthInit` の `useEffect` 内で `setOnAuthExpired` にログアウト処理を登録

**Web:**
- `createAuthenticatedFetch`（共有パッケージ `sync-engine`）の戻り値に `setOnAuthExpired` を追加
- Web版 `apiClient.ts` で `setOnAuthExpired` を re-export
- Web版 `useAuthInit` で登録

**共通:**
- コールバックは `authGenRef` をインクリメントし、進行中の認証処理を無効化
- cleanup で `setOnAuthExpired(null)` を呼び、リークを防止

### 3. Syncインジケーター（モバイル）

Web と同じパターンで、`_syncStatus === "pending"` のアイテムを視覚的に区別する:

- **LogCard**: amber border + amber背景 + orange `ActivityIndicator`
- **TaskList**: 同上
- `ActivityLogBase` / `DailyTask` 型に `_syncStatus?` フィールドを追加し、共有層からデータが透過的に流れるようにした

### 4. useAuth の分割

`useAuth.ts` が 250 行を超えたため、初期化ロジック（`serverRefreshAndSync`, `registerOnlineRetry`, `init`, `onAuthExpired` 登録）を `useAuthInit.ts` に切り出した。

## 結果

- リフレッシュトークンが回復不能な場合、ユーザーはログイン画面に戻される → 再ログインで正常なセッションを取得できる
- 500 系・ネットワークエラーではリトライが継続し、一時障害から自動回復する
- モバイルで未同期アイテムが視覚的に識別できるようになる
- `useAuth.ts`（~130行）と `useAuthInit.ts`（~140行）に分割され、200行制限を満たす

## 備考

- `_syncStatus === "failed"` の表示（現在は pending のみ対応）は、skippedIds による永続的な失敗状態が実際に問題になった際に追加検討する

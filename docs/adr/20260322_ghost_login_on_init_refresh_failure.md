# 起動時リフレッシュ失敗による幽霊ログイン問題

## ステータス

提案（判断保留）

## コンテキスト

20260321_force_logout_and_sync_indicator で、アクセストークン期限切れ後のリフレッシュ失敗時に強制ログアウトする仕組みを導入した。しかし、以下のケースではこの仕組みが機能しない:

**再現条件:** リフレッシュトークンが無効な状態でページリロード（またはアプリ再起動）

**フロー:**

1. `tryOfflineAuth()` — IndexedDB/SQLite に authState が残っている → `isLoggedIn=true`、UI表示
2. `serverRefreshAndSync()` — `/auth/token` に直接 POST → 4xx
3. customFetch は 4xx を見ても内部の `refreshAccessToken()` パスを通らない（401 リトライのみ）
4. `serverRefreshAndSync` は `!res.ok → return false` で静かに終了
5. `syncReady = false` のまま → autoSync / navigationSync 未起動

**結果:** ユーザーにはログイン済み UI が見えるが、同期は一切動かない。`onAuthExpired` も発火しない。記録したデータはローカルに溜まるだけでサーバーに届かない。

### オフラインファーストとの衝突

`tryOfflineAuth` で先に UI を出すのはオフライン対応の意図的な設計。ここで安易に「4xx なら即ログアウト」とすると、本当にオフラインのケースでも影響が出る可能性がある（DNS エラーがプロキシ経由で 4xx に化けるケースなど）。

## 検討中の選択肢

| 案 | 概要 | メリット | デメリット |
|----|------|---------|-----------|
| **A. serverRefreshAndSync 内で 4xx 検出 → onAuthExpired** | init 時の 4xx で即ログアウト | シンプル。既存の onAuthExpired 機構を流用 | オフライン環境の一部で誤ログアウトのリスク |
| **B. serverRefreshAndSync の戻り値をエラー種別付きにする** | init 側で「回復不能(4xx)」と「一時障害(network/5xx)」を分岐 | 正確な判断が可能 | customFetch 経由の /auth/token POST のステータスの意味が二重になる（customFetch の 401 リトライ後 or 生の結果） |
| **C. 失敗後フラグ → 次のユーザー操作で再試行して確定** | ネットワーク復帰で自動回復。本当に無効なら確定ログアウト | 誤ログアウトなし | 幽霊状態の期間が残る。UX 上「同期できません」の表示が必要 |
| **D. serverRefreshAndSync を customFetch 経由ではなく raw fetch で呼ぶ** | /auth/token のレスポンスを直接判定できる | ステータスの二重解釈を回避 | customFetch の credentials 設定等を自前で再実装する必要 |

## 未決定事項

- どの案を採用するか
- Mobile / Web で同じ方針にするか（Mobile は Bearer ヘッダー、Web は cookie で refresh token を送る違いがある）
- 幽霊ログイン状態のユーザー通知 UI（バナー等）が必要か
- `tryOfflineAuth` 成功 + `serverRefreshAndSync` 失敗のオンライン復帰リトライ（現 Web 版は `window.addEventListener("online", handler)` で最大1回リトライ）で十分か

## 備考

- 現状の `onAuthExpired` はアクセストークン期限切れ → sync API 401 → refresh 403 のパスでは正常に動作する（ブラウザで確認済み）
- この問題は「アプリ起動時に既にリフレッシュトークンが無効」という限定的なケースで発生する。通常利用では前者のパスでカバーされる
- ただし、長期間アプリを開かなかったユーザーや、サーバー側でセッション無効化された場合には現実的に発生しうる

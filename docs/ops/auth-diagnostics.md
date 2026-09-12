# 再ログインの診断

Web / iOS / Android の認証判断を変えず、更新失敗からログイン状態の消去までを記録する。
新しいネイティブ依存・DB migration はない。モバイルは対応する runtime へ OTA 配信できる。

## 記録する情報

- サーバー: refresh token の拒否理由、処理段階、rotation transaction の commit 済みフラグ、環境、自己申告の platform、cookie / Bearer の取得元。
- クライアント: 起動時のローカルログイン履歴の有無と経過時間、refresh の HTTP status / timeout / 通信・解析失敗、保存元・保存失敗、ログイン状態を消した理由。
- `flowId` はアプリ起動 / Web ページ読み込みごとの匿名 UUID。refresh のヘッダーと診断レポートに共通で付ける。ユーザーや端末の永続 ID ではない。
- `requestId` はサーバーが発行し、`X-Request-ID` で返す。個々の更新リクエストとクライアントの結果を結びつける。
- appVersion / runtimeVersion / OTA updateId はイベント発生時の値を保存する。

token 本文・selector・hash・JWT payload・password・ユーザー ID・任意の例外メッセージは認証診断に含めない。
クライアント側の報告は信頼済みの認証証跡ではなく、サーバー側の requestId と照合するための補助情報。

## 送信と保持

通常の成功は直前履歴（最大 8 件）にだけ保持する。更新失敗、保存失敗、状態消去時に履歴を添えて `/client-errors` に送る。
初回未ログインでも refresh を試すため `wasLoggedIn: false` の失効記録は正常な訪問でも発生する。
`wasLoggedIn: true` の `session_cleared` を先に確認する。

送信は認証不要で、認証付き fetch を経由しない。Web localStorage / Mobile AsyncStorage にイベントごとのキーで最大 6 レポートを保持し、7 日より古いものを除外する。
保存は送信待ちと分離し、複数タブのイベントも全体上書きで消さない。受信成功後は該当 eventId の保存だけを削除する。
起動・オンライン復帰・foreground 復帰と認証イベントで再送する。失敗後 30 秒は再送を抑制し、期限後の再送を予約する。同一理由は 1 分に 1 レポートまで。
診断機能の例外は認証処理へ伝播しない。端末ストレージ自体が使えない場合はメモリ内だけに保持する。

## WAE の確認

`wae-apm` の手順で Analytics Engine SQL API を使う。最初にユーザー申告時刻を UTC に直し、期間を狭く指定する。
以下の時刻は例。実際の調査期間に変更する。

```sql
SELECT timestamp, blob6 AS platform, blob7 AS appVersion,
       blob8 AS diagnostic, blob9 AS environment
FROM actiko_client_errors
WHERE timestamp >= toDateTime('2026-09-11 15:00:00')
  AND timestamp < toDateTime('2026-09-12 15:00:00')
  AND blob1 = 'auth_diagnostic' AND blob9 = 'production'
ORDER BY timestamp DESC LIMIT 100
```

`diagnostic` を JSON として読み、`trigger.event = session_cleared` と `trigger.wasLoggedIn = true` を探す。
`trigger.source` が `bootstrap` / `reconcile` なら起動・復帰時、`api_401` なら API の認証失敗からの再取得、`logout` / `account_delete` なら明示操作。
直前の `refresh_result` の requestId、または同じ flowId で API ログを探す。

```sql
SELECT timestamp, blob3 AS requestId, double1 AS status,
       blob7 AS error, blob9 AS authDiagnostic
FROM actiko_api_logs
WHERE timestamp >= toDateTime('2026-09-11 15:00:00')
  AND timestamp < toDateTime('2026-09-12 15:00:00')
  AND blob4 = 'POST' AND blob5 = '/auth/token'
  AND blob2 = 'Response sent'
ORDER BY timestamp DESC LIMIT 100
```

サーバーの `authDiagnostic` JSON の env が `production` のものを確認する。direct WAE と Tail が同じ requestId を記録し得るため、件数は requestId 単位で重複を除く。
クライアント報告も通信応答の取りこぼし・複数タブの再送で重複し得るため、eventId 単位で重複を除く。
配信前のログは環境・platform・詳細理由がない。同じ dataset に stg も入るため、過去の行だけで端末や本番ユーザーを断定しない。

| 観測値 | 分かること |
| --- | --- |
| `missing` / `missing_refresh_token` | サーバーへの Cookie 不在、または端末保存 token 不在。取得元も確認する |
| `expired` | 保存されている token の有効期限切れ |
| `revoked` / `deleted` | DB 上で無効化・削除済み。revoked だけで logout / grace 消費のどちらかは断定できない |
| `grace_expired` | 更新済みの旧 token が 30 秒の救済期間後に届いた |
| `hash_mismatch` / `malformed` / `not_found` | 提示値と DB の照合が成立しない |
| `race_lost` | 並列処理で更新条件を満たさなくなった |
| `grace_used` | 旧 token の一度限りの救済が使用された |
| `rotationCommitted: true` + `enrichment_failed` | token 保存後にレスポンス構築が失敗。直後の retry を追う |
| `storage_write_failed` → 次回起動の拒否 | 最新 token を受け取ったが永続化できず、次回古い値を送った可能性 |
| `timeout` / `network` / `invalid_response` | クライアントが応答を使用できなかった。サーバー側成功との組み合わせを見る |

2026-09-11 JST の既存ログでは 12:36 頃・23:25 頃に `/auth/token` の `invalid refresh token` と直後の login 成功を確認した。
当時のログには詳細理由と環境・端末の区別がなく、失効原因の確定には再発後の新しい診断が必要。

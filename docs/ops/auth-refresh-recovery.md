# 中断した認証更新の復旧

## 通常の更新と再取得

Web の再読み込み・アプリの終了は、サーバーの DB transaction と連動しない。旧 token の消費が commit された後で応答を失っても復旧できるよう、送信前に秘密の操作 nonce を保存し、`X-Refresh-Operation` ヘッダーで提示する。

nonce は暗号的乱数の UUID。公開の診断 `flowId` とは別の値で、ログ・URL・エラーメッセージに記録しない。DB には nonce の SHA-256 hash、親子関係、復旧期限を保存する。

同じ操作を再送した場合は同じ子 token を返す。提示した親または子の secret と、operation hash に対応する親子関係・user・family を照合する。nonce だけでは復旧できない。子が失効・削除・次世代へ更新済みなら古い子を返さない。再取得で DB 上の有効期限を延長しない。

親 token による復旧期限は親の元の有効期限。次の子の更新で古い復旧は閉じる。明示 logout は提示された token の family を失効させる。途中で更新済みになった親を使う logout も扱う。user 行の lock により更新・logout・全失効を直列化する。

Web の login / SSO で Cookie が置換された直後に終了すると、有効な新しい Cookie と前の session の nonce が残ることがある。`/auth/token` は、提示 token の secret・user・有効期限を検証済みで、かつ token が未消費の場合に限り、この不一致を 409 として返す。この応答では DB を更新しない。Web は pending nonce を新しい乱数へ一括上書きし、一度だけ再送する。保存に失敗したら一時エラーとして止める。既に消費済みの親、失効・削除済み token、不正 secret にこの回復を許可せず、401 を維持する。

## クライアント保存

- Web: API URL ごとの localStorage key に nonce を保存する。同一 origin の複数タブは Web Locks で更新を直列化する。受信本文を検証できるまで nonce を保持し、完了時には同じ値の場合だけ削除する。
- Mobile: SecureStore の `actiko-refresh-session-v2` に token と pending nonce を一つの JSON として保存する。既存の `actiko-refresh-token` から移行する。v2 がある場合は常に v2 を使い、破損時にも旧 token へ巻き戻さない。
- Mobile の logout: v2 に token / nonce が null の記録を残す。旧 key の削除に失敗しても、現行コードで旧 token を復活させない。
- 保存失敗: 新しい更新を送る前の保存が失敗したら認証情報を保持して一時エラーとする。応答を受け取った後の保存失敗は同じ結果の保存を優先する。

既存 SecureStore の iOS 実装は既存 key を `SecItemUpdate`、Android は暗号化した値を `SharedPreferences.Editor.commit()` で保存する。ネイティブ依存・設定の追加はない。端末を終了させる実機試験と、保存 API の失敗・プロセス再生成を模したテストは区別して報告する。

## 鍵変更と rollback

子 secret は `JWT_SECRET` から用途を分けて導出した HMAC-SHA256 鍵と、operation nonce / 子 selector を使って再構築する。平文 token を DB に保存しない。復旧時には再構築した secret の hash と保存済み child hash を照合する。

`JWT_SECRET` を変更すると、その前の鍵で確定した未受領の子は親から再構築できなくなる。hash 不一致は一時エラーとして扱い、認証情報を消去しない。この修正の配信時に鍵を変更しない。将来の鍵変更では古い鍵による未完了操作の復旧をどう扱うかを合わせて設計する。既に子 token を持っている場合の再取得には、その提示値を使える。

Mobile の旧 plain key は、v2 保存後に互換用コピーを更新する。異なる二つの key は一緒に commit できないため、コピー前に終了して旧 OTA へ戻す操作には古い token が残る窓がある。通常の現行コードの再起動は v2 で復旧する。アプリを以前の保存方式へ戻す配信は、現行 v2 の読み取りと復旧処理を残した修正版で行う。

DB migration は追加列・index と既存 family の補完。API を先に配信してから Web と両 OS の OTA を配信する。header のない旧クライアントは既存方式で受け付けるが、永続的な中断復旧には更新済みクライアントが必要。

移行前の DB には親子関係がないため、既存 token はそれぞれを family の起点として補完する。移行前に発行された別 token との関係は遡って復元しない。移行後は legacy / modern のどちらの更新でも family を引き継ぐ。

## 診断

ログの保存先・SQL は [認証診断](auth-diagnostics.md) を参照。

| サーバー reason | 意味 |
| --- | --- |
| `operation_replayed` | 同じ操作の確定済み結果を再取得した |
| `operation_mismatch` | 提示 token と操作の親子関係・family が一致しない。未消費の有効 token は 409 で新 nonce を要求し、消費済み token は 401 で拒否する |
| `recovery_expired` | 親を使った再取得の固定期限を過ぎた |
| `recovery_closed` | 既に次の更新・失効・削除などで再取得できない |

`operation_replayed` と `rotationCommitted: true` の応答の後に、同じ flowId の `session_established` が続くことを確認する。診断の成功履歴は直近の breadcrumbs に保持し、通常の成功ごとに独立した client error を送ることはしない。

既に旧方式で無効化され、端末から削除された token をこの修正で復元することはできない。その場合は一度ログインして、新しい方式の session を作る。

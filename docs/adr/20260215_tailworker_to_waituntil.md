# WAE書き込みをTail Workerからメインアプリのwaituntilに移行

## ステータス

決定

## コンテキスト

- Tail WorkersがCloudflare Workers Paid plan ($5/月) 限定であることが判明し、デプロイがブロックされた
- 既にWAEにはデータが入っており、APM基盤として活用中
- Tail Workerを使わずにWAEへ書き込む方法として、メインアプリ内で`executionCtx.waitUntil()`を使う方式がある
- `waitUntil()`はレスポンス返却後に非同期で処理を実行するため、レイテンシに影響しない
- Analytics Engine自体は無料プランで利用可能

## 決定事項

- loggerMiddleware内で`c.executionCtx.waitUntil()`を使い、WAEへ直接書き込む
- Tail Workerのコード（`apps/tail-worker/`）は将来のPaid plan移行時のために削除せず残す
- wrangler.tomlから`tail_consumers`を削除し、代わりに`analytics_engine_datasets`バインディングを追加
- Analytics Engineのdataset名は機密情報ではないため、wrangler.tomlに直接記載する

## 結果

- 有料プラン不要でWAEへのログ送信を維持できる
- Worker1つで完結するため、デプロイ・管理がシンプルになる
- ログ処理がメインアプリと密結合になるが、個人プロジェクトでは問題にならない
- 将来Paid planに移行した場合、`tail_consumers`を復活させてTail Worker方式に戻すことも可能

## 備考

- Tail Workerの利点（メインアプリからの分離、失敗時の影響がない）は失われる
- `waitUntil()`内でWAE書き込みが失敗してもレスポンスには影響しないが、エラーがサイレントに無視される

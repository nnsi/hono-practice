# レートリミットのストレージをDurable ObjectsからWorkers KVへ移行

## ステータス

採用 — 2026-07-14の再評価でも本決定を継続する。[20260713 原子的なレート制限とAIクォータ](./20260713_atomic_rate_limits.md)は不採用とした

## コンテキスト

- WAEのデータ分析により、`/auth/token`の平均レイテンシが943msであることが判明
- 内訳を見ると、DB（Neon）のコールドスタートで950〜1,770ms、Durable Objectのコールドスタートで560〜1,036msかかっていた
- DBのコールドスタートはNeon無料プランのscale-to-zeroに起因し、無料枠では回避困難
- 一方、DOのコールドスタートはCloudflare Workers KVに置き換えることで解消可能
- Workers KVはエッジにキャッシュされるため、コールドスタートが発生しない
- Workers KV無料枠: 読み取り10万回/日、書き込み1,000回/日（個人アプリには十分）
- KVは結果整合性のため厳密なレートリミットには不向きだが、個人利用では問題にならない

## 決定事項

- レートリミット用ストレージをDurable ObjectsからCloudflare Workers KVに移行する
- アプリケーション層が所有するrate limit用portを維持し、CloudflareではWorkers KV、Node環境ではRedisのアダプターを使用する
- Workers KV上のrate limitとAI quotaはsoft limitとし、並列要求に対する厳密な上限は保証しない
- AI利用額のhard capはprovider側の予算上限と利用量アラートで管理する
- KV namespace IDはpublicリポジトリに含めず、CIで動的に注入する（既存パターンに合わせる）
- ローカル開発環境はRedisのまま変更しない

## 結果

- DOのコールドスタート500〜1,000msをリクエスト経路から除外できる
- 上位層はapplication-owned portへ依存するため、Cloudflare KVとRedisの選択を意識しない
- Workers KVの結果整合性により、同時リクエストの一部が上限を超える残存リスクを受容する
- Workers KVは同一キーを毎秒1回までしか書き換えられない。短時間の連続要求では非同期`put`が失敗してカウンターが進まず、結果整合性によるburst以上に過剰許可する可能性を受容する
- 旧 DO 実装コードは不要になるため削除

## 備考

- 2026-07-13には、認証・AI quota・同時実行制御を厳密にするためDOへ戻す案を検討した
- 2026-07-14に費用リスクと既知のレイテンシを再比較し、個人向けアプリで数件の超過を防ぐためにDOの遅延を全利用者へ課すのは比例しないと判断した
- 既存KV namespace、Terraform管理、`KV_RATE_LIMIT_ID_STG` / `KV_RATE_LIMIT_ID_PROD`の導線は維持する
- KV書き込み失敗は構造化エラーとして記録し、WAEで監視する。現在の要求はsoft limitとして継続し、次回要求も保存済みsnapshotから判定する。この動作は回帰テストで固定する
- 同一キーの書き込み上限は[Cloudflare Workers KVの制限](https://developers.cloudflare.com/kv/platform/limits/)に従う
- 実際の不正利用、予算超過、下流APIの厳密な同時実行制約が観測された場合に限り、対象経路のDO化を再検討する
- DBのコールドスタート（Neon scale-to-zero）は今回のスコープ外。将来的にD1/Turso移行やNeon有料プランで対応する可能性あり
- WAEデータの94%がボットの404リクエストだったため、Tail Workerに404フィルタも追加済み

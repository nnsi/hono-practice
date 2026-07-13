# レートリミットのストレージをDurable ObjectsからWorkers KVへ移行

## ステータス

廃止 — [20260713 Atomic rate limits and AI quotas](./20260713_atomic_rate_limits.md) により置換

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
- `KeyValueStore<T>`インターフェースは維持し、アダプター層のみ差し替える
- KV namespace IDはpublicリポジトリに含めず、CIで動的に注入する（既存パターンに合わせる）
- ローカル開発環境はRedisのまま変更しない

## 結果

- DOのコールドスタート500〜1,000msが解消され、レートリミット処理がほぼ0msになる見込み
- `KeyValueStore<T>`抽象のおかげでミドルウェア・ルート層の変更は不要
- 旧 DO 実装コードは不要になるため削除

## 備考

- 2026-07-13の再評価で、認証・AI quota・同時実行制御では結果整合性によるburst許容を受け入れられないと判断した
- 旧KV namespaceのTerraform stateと実resourceの撤去は外部インフラ作業として分離し、application bindingから先に除外した
- DBのコールドスタート（Neon scale-to-zero）は今回のスコープ外。将来的にD1/Turso移行やNeon有料プランで対応する可能性あり
- WAEデータの94%がボットの404リクエストだったため、Tail Workerに404フィルタも追加済み

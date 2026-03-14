# GitHub Actions セキュリティ強化（SHA固定 + env経由）

## ステータス

決定

## コンテキスト

Zenn の GitHub Actions Injection 記事をきっかけに `deploy.yml` のセキュリティを評価した。記事の3攻撃ベクター（コマンドインジェクション、`pull_request_target` 悪用、AI プロンプトインジェクション）については問題なかったが、記事にない以下のリスクを検出した:

1. **サードパーティ Action の SHA 未固定**: タグ参照（`@v4` 等）はタグの付け替えで任意コードが実行される。`tj-actions/changed-files` は2025年3月に実際にサプライチェーン攻撃を受けた前例がある。
2. **`${{ secrets/vars }}` の `run:` 内直接展開**: シェルインジェクションのリスク（本ワークフローでは外部入力がないため実害は低いが、ベストプラクティス違反）。

## 決定事項

1. **5つの Action 全てをコミット SHA 固定**。`gh api` で SHA を取得。annotated tag の場合は `object.sha` が tag object を指すため、`/git/tags/{sha}` で deref して実コミット SHA を取得する。

2. **`run:` 内の `${{ secrets/vars }}` を全て `env:` 経由に変換**。heredoc 内は `${VAR}`、wrangler secret put は `echo "$VAR" | ...` で受け渡し。

3. **`echo` → `printf '%s'` に統一**。`echo` は末尾改行付与や `-n` 解釈の環境差異があり、値の正確性に影響する。

## 結果

- サプライチェーン攻撃に対する耐性が向上（SHA 固定により、リポジトリ侵害されてもピン留めしたコミット以外は実行されない）
- シェルインジェクションのリスク排除（secrets/vars が env 経由でクォートされる）
- Action のバージョンアップは手動で SHA を更新する運用コストが発生するが、セキュリティとのトレードオフとして許容

## 備考

- `wrangler.toml` への `HYPERDRIVE_ID` 等の書き込みは Cloudflare 仕様上必須。これらはリソース ID であり認証情報ではない。ランナーはエフェメラルなので漏洩リスクは低い。

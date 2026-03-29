# WAEログアーカイブ（cron定期実行 → R2 CSV保存）

## 概要
WAEのデータ保持期間は90日。90日を超えた分はAPI経由で検索できなくなるため、cron Workerで定期的にR2にCSVとして退避する。

## 方針
- **R2 + CSV**: DBに入れる必要はない。消えなければいい程度の保存。必要になったらDLしてローカルで加工する想定
- **Cloudflare Cron Triggers**: Workers側の定期実行機能を使う。こちら側からの呼び出し不要
- **専用Worker**: 既存APIワーカーとは別のWorkerとして分離

## 保存形式（案）
- パス: `wae-archive/api-logs/YYYY-MM.csv`, `wae-archive/client-errors/YYYY-MM.csv`
- 月次でWAE SQL APIから前月分を取得してCSV化

## 前提条件（着手前にやること）
- **Terraformの稼働**: R2バケットやWorkerの定義はTerraformで管理したい。現状Terraformは書いてあるがGitHub Actionsで動いていないため、まずIaCパイプラインを整備してからこのタスクに着手する

## ステータス
未着手（Terraform GitHub Actions整備待ち）

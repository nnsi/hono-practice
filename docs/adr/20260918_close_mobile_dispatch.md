# モバイルリリースの手動デプロイ経路（workflow_dispatch）を閉じる

## ステータス

決定

## コンテキスト

`docs/adr/20260316_mobile_cicd_workflow_dispatch.md` では、モバイルの build / OTA を `deploy.yml` の `workflow_dispatch` から実行する方針を採った。
しかし実運用では EAS build も OTA もローカルの CLI（`/eas-build`、`/ota-update` skill）から投入されており、workflow_dispatch は一度も使われていなかった。
2026-09-11 に初めて workflow_dispatch で build を投入したところ、GitHub の `staging` environment に `EAS_PROJECT_ID` / `EAS_OWNER` / `BUNDLE_ID` / `EXPO_TOKEN` / RevenueCat キーが未登録で preflight に落ちた（EAS 側にビルドは作られず）。

使われない経路を残すと、環境変数の二重管理と、壊れていることに気づかない期間が生まれる。

## 決定事項

- `deploy.yml` から `workflow_dispatch` の入力と `mobile-release` ジョブを削除する。deploy workflow は `master` / `release` への push による Web / Backend のデプロイのみを担う
- モバイルの build と OTA はローカルから実行する（`.agents/skills/eas-build`、`.agents/skills/ota-update`）。OTA の native 互換判定 `scripts/mobile-ota-safety.js` はローカル手順で引き続き使う
- 本番モバイルリリースを CI から行う必要が出たら、その時点で environment の変数登録と合わせて再設計する

## 結果

- `scripts/release-workflow.test.ts` は「手動モバイルリリース経路が無いこと」を検証する
- GitHub environment へのモバイル用変数登録は不要になった

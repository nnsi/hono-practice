# Actiko 公開リリース前チェックリスト索引

> 作成日: 2026-07-13
> 現在の判定: **No-Go**
> 根拠: [リリース可否評価レポート](../report/release-readiness-20260713.md)

チェック項目を、完了条件の違いに基づいて2つへ分離した。

| チェックリスト | 完了条件 | 主な対象 |
|---|---|---|
| [コード・リポジトリ内チェックリスト](./pre-release-code-checklist.md) | コード、設定ファイル、自動テスト、ローカル検証だけで完了できる | API、Web、Mobile、Native、CI定義、依存、回帰テスト |
| [外部サービス・配布チェックリスト](./pre-release-external-checklist.md) | 外部アカウント、secret、実機、課金、build、deploy、ストア操作が必要 | EAS、RevenueCat、Polar、Cloudflare、TestFlight、Google Play、ストア申請 |

## 分類ルール

- repositoryへcommitでき、外部環境へ接続せず完了を証明できるものは「コード・リポジトリ内」
- 外部dashboard、secret値、署名、課金sandbox、クラウド環境、実端末、審査が必要なものは「外部サービス・配布」
- GitHub Actionsのworkflow実装は「コード・リポジトリ内」、GitHubへのsecret登録とworkflow実行は「外部サービス・配布」
- EAS設定ファイルとruntime設計は「コード・リポジトリ内」、EAS Buildとcredential確認は「外部サービス・配布」
- 課金状態遷移の実装・mock testは「コード・リポジトリ内」、RevenueCat/Polarの商品設定・Webhook・sandbox購入は「外部サービス・配布」

## リリースゲート

1. コード側のP0をすべて完了する
2. コード側の自動検証をrelease candidate SHAで成功させる
3. 外部サービスの環境変数・課金・署名設定を完了する
4. EAS usageと課金可能性を確認し、明示承認後にproduction buildする
5. 同じbinaryをTestFlight / Play内部テストで確認する
6. ストア掲載・申告・審査情報を完成させる
7. production deploy / submitの明示承認を得る
8. 両チェックリストの最終承認を完了してGoとする

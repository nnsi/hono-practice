# Actiko 現在のリリース状況

更新日: 2026-10-01（JST）。7月の評価は当時の記録であり、現在の進捗はこの文書を参照する。

## 今回の配信範囲

ユーザーは今回の依存更新・RevenueCat修正・規約修正についてPRのマージとリリースを依頼済み。既存の `master → release` とGitHub ActionsによるWeb / API / Admin / Tail Workerの配信を進める。ストア公開の承認・完了を意味しない。iOSのストア設定・審査準備はユーザー判断で後回し。Mobileへの検証用Test Storeキー・ローカルAPIのOTA配信は行わない。

変更PR: [#281](https://github.com/nnsi/hono-practice/pull/281)。配信は `master → release` のPRとDeploy Cloudflare runで管理する。マージ・デプロイの完了時刻と結果はリンク先のPR/Actionsを正とし、PR作成時の検証完了を本番反映完了とは扱わない。

## 完了した内容

- 依存監査: 全依存141件 / prod指定55件から、両方とも全severity 0へ更新。互換patchとiOS/Android JS exportを検証済み。詳細は[依存監査](../report/dependency-audit-20260930.md)。
- RevenueCat: Actiko projectにTest Store、月額商品、`premium` entitlement、Current Offering、Sandbox限定Webhookを設定。復元は元のActikoアカウントに固定。
- 専用iOS Debug Simulatorと隔離PGliteで、実SDK購入 → Webhook → Premium反映、購入キャンセル・失敗、Webhook遅延からの回復、実更新イベント前後のPremium維持を確認。返金・失効・重複・順序逆転・環境分離は自動テストでも検証。詳細は[ローカル検証](../ops/revenuecat-local.md)。
- 本番ではSANDBOXイベントを適用しない。購入後にWebhookが遅れた場合は再購入を促さず確認中と表示。任意の `REVENUECAT_API_KEY` が設定された場合に限り、直前まで有効だった更新待ちの利用権を読み取り専用APIで短時間照合する。未設定でも従来のDB判定で動作する。
- 規約・プライバシーポリシーの日英文面を実態に合わせて修正。未運用の「退会後6か月で自動完全削除」等の保証を外し、手動削除、ストア解約、RevenueCat/OpenRouterへの送信内容を明記。[法務上の残件](../report/legal-readiness-20260930.md)は別途残る。
- Google Play: `com.actiko.app` に既存EAS preview APKと一致する公開署名証明書を登録。Google指定コードを含む専用APKをローカルで作成し、同じ既存鍵で署名して提出。パッケージと鍵の表示が **審査中** であることを確認。Googleの案内は通常すぐ、最長48時間、結果はメール。アプリのストア審査とは別の所有権確認である。
- 所有権確認にEAS Buildは使用せず、追加料金なし。署名用に取得したローカル秘密鍵・passwordファイルは処理後に削除。確認用APKや秘密値はgitへ含めない。

## 残っていること

- Android所有権確認: Googleの審査結果待ち。成功とはまだ扱わない。
- App Store / Google Playの商品接続、platform-specific SDKキー、本番Webhook・必要な環境設定、実ストアSandbox購入・同一アカウント復元・別アカウント復元拒否の確認。Test StoreのrestoreはCustomerInfoを返すだけで、ストアレシート復元の検証にはならない。
- Google Play内部テストと掲載・データセーフティ。画面上の本番アクセス条件は12人以上のクローズドテスターによる14日間の連続テストで、確認時点の人数は0。公開はまだ完了していない。
- iOS App Store Connect、署名/capability、本番商品、TestFlight、審査準備は後回し。
- 退会後の物理削除運用、改定通知と既存利用者への適用日、委託・海外移転条件とストア申告の照合。文面修正だけで運用完了とはしない。
- Polarは現状の課金導線が閉じているため今回の有効化対象外。導線を開く前に商品・secret・Webhook・購入を確認する。

## 検証の記録

最新master取り込み前の今回の実装: `pnpm run ci-check` 成功、320ファイル passed / 1 skipped、3,026 tests passed / 2 skipped、guard・lint・Web/Admin/Mobile型チェック成功。Web entitlement E2E 5件、追加ローカル検証scriptの型チェックも成功。最新master統合後の結果はPRへ記録する。

既存previewは本番DBへ接続するため、Test Storeの検証は専用ローカル環境だけで実施した。本番の実決済、ストア配布、今回の変更の本番反映は、この検証結果には含めない。

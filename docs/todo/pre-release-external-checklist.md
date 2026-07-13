# Actiko リリース前チェックリスト — 外部サービス・配布

> 対象: 外部dashboard、secret、署名、実課金、クラウドbuild/deploy、実機、ストア申請
> 前提: [コード・リポジトリ内チェックリスト](./pre-release-code-checklist.md)
> 関連: [Mobileストアリリースチェックリスト](./mobile-release.md)

## 実行ルール

- コード側P0完了前にproduction deploy / EAS production build / store submitを実行しない
- secret値、credential、署名鍵を文書やcommand outputへ残さない
- EAS Build、deploy、submit、有料API実行の直前に、課金可能性と対象操作を説明してユーザー承認を得る
- EAS Build直前に`eas account:usage <account-name> --json`を実行する
- `builds.plan.percentUsed >= 100`、usage不明、追加課金警告ありの場合は承認なしに続行しない
- 外部作業の証跡は値ではなく、設定名・build ID・run URL・確認日時だけを記録する

## コード側引き渡し（2026-07-13）

- release candidate commit: `dc09c6a85150596b267feb0e9a451bac78b8c3d8`
- migration: `0042_fixed_gertrude_yorkes.sql`
- Mobile version / runtimeVersion: `1.1.0`
- CI: 233 test files / 2,402 tests、実Miniflare KV、実Redis統合、Biome、全TypeScript projectが成功
- E2E: 20 files / 69 testsが成功
- local build: Web / Admin production build、Mobile Web / iOS / Android production exportが成功
- native: Swift Widget execution test、全Widget target sourceのiOS 17 simulator type-check、Android Kotlin compile、Widget unit test、release AAR assemblyが成功
- browser: offline同期、別browser反映、Free plan UI、Admin session restore/logout、Redis有効化backendでのAdmin/public login flowを確認
- review: Security / Logic / Architecture / Testability / Nativeが全員LGTM
- `EAS Build`、deploy、実課金、外部secret確認、実機、store操作は未実行。以下の外部項目は担当者が証跡を確認してからチェックする

## P0-E01: GitHub / EAS / Cloudflare環境設定

- [ ] GitHub Actionsで`EXPO_TOKEN`を参照できることを確認する
- [ ] GitHub Actionsで`EAS_PROJECT_ID`を参照できることを確認する
- [ ] GitHub Actionsで`EAS_OWNER`を参照できることを確認する
- [ ] GitHub Actionsでproduction/preview bundle IDを参照できることを確認する
- [ ] EAS productionへ`EXPO_PUBLIC_API_URL`を登録する
- [ ] EAS productionへ`EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS`を登録する
- [ ] EAS productionへ`EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID`を登録する
- [ ] EAS productionへ`EXPO_PUBLIC_REVENUECAT_API_KEY_IOS`を登録する
- [ ] EAS productionへ`EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID`を登録する
- [ ] EAS productionへ`EXPO_PUBLIC_CONTACT_EMAIL`を登録する
- [ ] EAS productionへ`EXPO_PUBLIC_WEB_URL`を登録する
- [ ] EAS previewにも同じ必須変数を環境別の値で登録する
- [ ] Cloudflare productionに`POLAR_WEBHOOK_SECRET`が存在することを確認する
- [ ] Cloudflare productionに`POLAR_ACCESS_TOKEN`が存在することを確認する
- [ ] Cloudflare productionに`POLAR_PRICE_ID`が存在することを確認する
- [ ] Cloudflare productionに`REVENUECAT_WEBHOOK_AUTH_KEY`が存在することを確認する
- [ ] Cloudflare productionに`OPENROUTER_API_KEY`が存在することを確認する
- [ ] Cloudflare productionに`JWT_SECRET_ADMIN`が存在することを確認する
- [ ] Cloudflare productionのR2/Hyperdrive/Analytics Engine/Workers KV (`RATE_LIMIT_KV_NS`) bindingと`KV_RATE_LIMIT_ID_PROD`を確認する
- [ ] production CORS originを実ドメインと照合する
- [ ] secret名のpreflight結果だけをrelease証跡へ記録する

## P0-E02: RevenueCat設定

- [ ] RevenueCat projectとiOS bundle IDを照合する
- [ ] RevenueCat projectとAndroid package名を照合する
- [ ] App Store Connectのsubscription productをRevenueCatへ接続する
- [ ] Google Playのsubscription productをRevenueCatへ接続する
- [ ] `premium` entitlementを作成・確認する
- [ ] iOS/Android productを`premium` entitlementへ紐付ける
- [ ] Current Offeringを作成・確認する
- [ ] production API keyをEAS環境へ反映する
- [ ] sandbox testerを準備する
- [ ] RevenueCat Webhook URLをproduction APIへ設定する
- [ ] Webhook auth headerをbackend設定と照合する
- [ ] purchase eventがproduction/stgの意図した環境へ届くことを確認する
- [ ] renewal/cancellation/expiration eventを確認する
- [ ] anonymous user eventの扱いをdashboard logで確認する
- [ ] RevenueCat dashboardの権限と所有者を確認する

## P0-E03: Polar設定

- [ ] Polar organization/projectを確認する
- [ ] production product/priceを作成・確認する
- [ ] `POLAR_PRICE_ID`をbackend設定と照合する
- [ ] checkout success URLをproduction Web domainと照合する
- [ ] Polar Webhook URLをproduction APIへ設定する
- [ ] Webhook secretをbackend設定と照合する
- [ ] subscription.createdをsandbox/test環境で確認する
- [ ] subscription.updated/activeを確認する
- [ ] subscription.canceledを確認する
- [ ] subscription.revokedを確認する
- [ ] redirectがWebhookより先に戻るケースを実環境で確認する
- [ ] Polar dashboardの権限と所有者を確認する

## P0-E04: Apple / Google capability・credential

- [ ] Apple Developer Portalのproduction App IDを確認する
- [ ] production App IDへApp Groupsを付与する
- [ ] production App IDへKeychain Sharingを付与する
- [ ] Widget extension App IDのcapabilityを確認する
- [ ] Provisioning ProfileへApp Group/Keychain entitlementが含まれることを確認する
- [ ] Apple Sign InのService IDとredirect URLを確認する
- [ ] Google OAuth iOS clientのbundle IDを確認する
- [ ] Google OAuth Android clientのpackage名と署名fingerprintを確認する
- [ ] Google Play upload keyとApp Signing keyを確認する
- [ ] EAS credentialが正しいApple Team/Google keyを使用することを確認する

## P0-E05: EAS production build

- [ ] コード側チェック完了commit SHAを受領する
- [ ] version / build number / runtimeVersionを確認する
- [ ] `eas account:usage <account-name> --json`を実行する
- [ ] current cycle usageを記録する
- [ ] 課金可能性、platform、profile、対象SHAをユーザーへ提示する
- [ ] ユーザーの明示承認を記録する
- [ ] iOS production buildを実行する
- [ ] Android production buildを実行する
- [ ] 両buildが同じrelease candidate SHAであることを確認する
- [ ] iOS build ID、fingerprint、runtime、version、build numberを記録する
- [ ] Android build ID、fingerprint、runtime、version、versionCodeを記録する
- [ ] Swift Widget targetのcompile成功をbuild logで確認する
- [ ] Kotlin module/config pluginのcompile成功をbuild logで確認する
- [ ] 生成されたiOS entitlementを確認する
- [ ] 生成されたAndroid Manifestのexported component/permissionを確認する
- [ ] build artifactの有効期限を記録する

## P0-E06: TestFlight / Play内部テスト

- [ ] iOS production binaryをTestFlight内部テストへアップロードする
- [ ] Android production binaryをPlay内部テストへアップロードする
- [ ] テスターを登録する
- [ ] 新規installをiOS実機で確認する
- [ ] 新規installをAndroid実機で確認する
- [ ] 旧versionからのupgrade installを確認する
- [ ] 新規登録・password loginを確認する
- [ ] Google loginをiOS/Androidで確認する
- [ ] Apple loginをiOSで確認する
- [ ] token refreshとlogoutを確認する
- [ ] offline作成・編集・削除・再同期を確認する
- [ ] 別端末同期を確認する
- [ ] Activity/Kind/Log/Goal/Task/Noteの主要CRUDを確認する
- [ ] CSV import/exportを確認する
- [ ] 画像選択・upload・削除を確認する
- [ ] RevenueCat sandbox購入を確認する
- [ ] RevenueCat restoreを確認する
- [ ] RevenueCat解約・期限切れ反映を確認する
- [ ] Polar test購入・redirect・Webhook反映を確認する
- [ ] Android無料Widget初回設定を確認する
- [ ] iOS/Androidで複数Widgetを確認する
- [ ] Timer/Counter/Check/Binary Widgetを確認する
- [ ] iOS音声ショートカットを確認する
- [ ] Android音声記録導線を確認する
- [ ] 外部アプリから保護対象Intent/broadcastを実行できないことを確認する
- [ ] Widget記録とReact Native画面の反映を確認する
- [ ] preview binaryでOTA updateを確認する
- [ ] client errorが管理画面へ届くことを確認する

## P1-E07: ストア掲載・申告

- [ ] App Storeのsubtitle/description/keywordsを確定する
- [ ] Google Playのshort/full descriptionを確定する
- [ ] App Storeカテゴリを確定する
- [ ] Google Playカテゴリを確定する
- [ ] 対象年齢を設定する
- [ ] iPhone用スクリーンショットを作成する
- [ ] iPad用スクリーンショットを作成する
- [ ] Android用スクリーンショットを作成する
- [ ] Androidフィーチャーグラフィックを作成する
- [ ] サポートURLを公開・確認する
- [ ] プライバシーポリシーURLを公開・確認する
- [ ] App Review用デモアカウントを準備する
- [ ] App Review noteへlogin手順を書く
- [ ] App Review noteへ課金確認手順を書く
- [ ] App Review noteへWidget/音声機能の確認手順を書く
- [ ] Google Playデータセーフティを実装内容と照合する
- [ ] App Store Privacy Detailsを実装内容と照合する
- [ ] RevenueCat / Polar / OpenRouterへ送信するデータを申告する
- [ ] コンテンツレーティングを回答する
- [ ] ターゲットオーディエンスを設定する
- [ ] 暗号化輸出コンプライアンス回答を確認する
- [ ] subscription terms、価格、trial表示を確認する
- [ ] アカウント削除導線をストア要件と照合する

## P1-E08: production infra preflight

- [ ] production DB backupまたは復旧ポイントを確認する
- [ ] migration実行権限を確認する
- [ ] Cloudflare Workerの直前versionへrollback可能であることを確認する
- [ ] Web artifactのrollback先を確認する
- [ ] API、Web、Admin、Tail Workerのproduction targetを確認する
- [ ] OAuth redirect URIをproduction domain/bundle IDと照合する
- [ ] WAE API logが受信されることを確認する
- [ ] WAE client error logが受信されることを確認する
- [ ] OpenRouter利用量・費用アラートを設定する
- [ ] RevenueCat Webhook失敗アラートを設定する
- [ ] Polar Webhook失敗アラートを設定する
- [ ] DB connection、R2、Hyperdrive、Workers KVのエラー・レイテンシ監視を確認する
- [ ] 公開直後の監視担当と連絡経路を確定する
- [ ] rollback/公開停止の判断担当を確定する

## P1-E09: production deploy

- [ ] release candidate SHA、migration、artifact、Mobile build IDを再確認する
- [ ] コード側最終確認が完了していることを確認する
- [ ] 外部側P0が完了していることを確認する
- [ ] deploy対象、課金可能性、外部影響をユーザーへ提示する
- [ ] ユーザーの明示承認を記録する
- [ ] production DB migrationを実行する
- [ ] Backend APIをproductionへdeployする
- [ ] Webをproductionへdeployする
- [ ] Admin Webをproductionへdeployする
- [ ] Tail Workerをproductionへdeployする
- [ ] production API smoke testを実行する
- [ ] production Web smoke testを実行する
- [ ] production Admin smoke testを実行する
- [ ] 認証、同期、課金、error reportingのsmoke testを実行する
- [ ] production version/run URLをrelease証跡へ記録する

## P1-E10: store submit・公開

- [ ] submit対象binaryとbuild IDを再確認する
- [ ] submitの外部影響をユーザーへ提示する
- [ ] ユーザーの明示承認を記録する
- [ ] iOSをApp Store Connectへsubmitする
- [ ] AndroidをGoogle Playへsubmitする
- [ ] 審査ステータスを記録する
- [ ] 審査質問・rejectへの対応担当を確定する
- [ ] 承認後の公開方式を手動または段階公開に設定する
- [ ] iOS公開日時を記録する
- [ ] Android公開日時を記録する

## 公開直後の外部監視

- [ ] App Store公開versionを新規installする
- [ ] Google Play公開versionを新規installする
- [ ] API 4xx/5xx、latency、DB errorを監視する
- [ ] client errorをWeb/iOS/Android別に監視する
- [ ] 同期失敗・rejected件数を監視する
- [ ] login/register/refreshの失敗率を監視する
- [ ] RevenueCat/Polar Webhook失敗を監視する
- [ ] plan不整合の問い合わせ・logを監視する
- [ ] OpenRouter利用量と推定費用を監視する
- [ ] Widget記録失敗・誤記録を監視する
- [ ] store reviewとユーザー問い合わせを監視する
- [ ] rollbackまたは公開停止判断を記録する

## 外部側最終承認

- [ ] EAS/credential確認: build・署名・runtime整合
- [ ] RevenueCat確認: 商品・entitlement・Webhook・sandbox成功
- [ ] Polar確認: 商品・checkout・Webhook成功
- [ ] Cloudflare確認: secret・binding・deploy・監視正常
- [ ] TestFlight確認: 必須実機シナリオ成功
- [ ] Google Play内部テスト確認: 必須実機シナリオ成功
- [ ] Store/Legal確認: 掲載・申告完了
- [ ] 運用確認: 監視・rollback準備完了
- [ ] ユーザー最終承認: Go

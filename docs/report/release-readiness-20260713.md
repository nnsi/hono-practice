# Actiko リリース可否評価レポート

> 評価日: 2026-07-13
> 対象: `master` (`90a4866b`)
> 対象領域: Backend API / Web / Admin Web / Mobile / Native Widget / CI・配布設定
> 総合判定: **No-Go**

## 1. エグゼクティブサマリ

現時点の公開リリースは推奨しない。

テスト、型チェック、Web E2E、JS bundle生成などの基礎品質は高い。一方、以下の本番影響を持つ阻止条件が残っている。

- オフラインで作成したActivity/Kindが、401または一部の400系応答によって恒久的に同期対象外になる
- 有効なpremiumユーザー/API keyからOpenRouterの従量コストを無制限に発生させられる
- 課金Webhookの到着順序が逆転すると、subscription状態が古い状態へ戻り得る
- Android無料ユーザーが最初のWidgetを設定できない
- iOSで複数のTimer Widgetが別Activityへ誤記録し得る
- iOS Widgetが音声記録用Keychainへアクセスするentitlementを持っていない
- Androidのexported componentを他アプリから起動し、保存済み資格情報で記録APIを実行できる
- Expo SDK 57のNative production buildと実機確認が存在しない
- RevenueCatのiOS/Android公開キーがEAS環境に登録されていない
- ストア掲載情報、ベータ確認、審査前作業が完了していない

### 領域別判定

| 領域 | 判定 | 主な理由 |
|---|---|---|
| Backend API | **No-Go** | AIコスト制限、rate limit、Webhook順序制御、課金設定の再現性 |
| Web / Admin Web | **No-Go** | 同期データ欠落、共有packageのdeploy漏れ、Admin token管理 |
| Mobile | **No-Go** | Native Widget不具合、外部Intent面、SDK 57未ビルド、課金環境変数不足 |
| 総合 | **No-Go** | データ・課金・セキュリティ・配布の複数領域に阻止条件がある |

## 2. 評価方法と検証結果

Security / Logic / Architecture / Testability / Nativeの5観点でコードを確認し、重要指摘は実コードで再確認した。

### 成功した検証

- `pnpm run ci-check`
  - ガード3種成功
  - 195 test files / 2,216 tests 成功
  - Biome lint 成功
  - Backend / Web / Admin Web / Mobile typecheck 成功
- `pnpm run test-e2e`
  - 38 test files / 134 tests 成功
- Web PWA production build 成功
- Admin Web production build 成功
- MobileのWeb / iOS / Android向けMetro・Hermes bundle生成成功
- GitHub上の最新`master` CI成功
- tracked file内に平文の本番secretは検出されなかった

### 失敗または未完了の検証

- Expo Doctor: 20項目中1項目失敗
  - Expo SDK 57関連11パッケージが推奨patch版と不一致
- `pnpm audit --prod`: high 5件 / moderate 2件
  - 主に`@bacons/apple-targets`配下のbuild tooling依存
- EAS production build: 0件
- Expo SDK 57でのiOS/Android Native build: 0件
- 最新成功EAS buildは2026-05-19のSDK 55 preview
- Mobile Widgetの実機E2Eなし
- RevenueCatの実決済からWebhook反映までの統合試験なし
- Cloudflare本番secretの実在は、ローカルにAPI tokenがないため確認できなかった

### 実行しなかった操作

EAS Build、deploy、submit、課金APIの実呼び出しは、費用または外部状態変更を伴うため実行していない。

## 3. 横断的な阻止条件

### R-01: 4xx応答で未同期データが恒久rejectになる

- Web: [`apps/frontend/src/sync/syncActivities.ts`](../../apps/frontend/src/sync/syncActivities.ts#L26)
- Mobile: [`apps/mobile/src/sync/syncActivities.ts`](../../apps/mobile/src/sync/syncActivities.ts#L27)

401を含む全4xxについて、chunk内のActivity/Kindをすべて`rejected`へ変更している。repositoryが再送対象にするのは`pending`と`failed`だけなので、以後自動同期されない。

想定経路:

1. access tokenのrefreshが一時的に失敗して401を受ける
2. またはchunk内の1件がvalidation errorになる
3. chunk全体が`rejected`になる
4. ローカル画面には残るがサーバーへ届かない
5. 別端末・再インストール時にデータ欠落として顕在化する

これはWeb/Mobile共通のリリース阻止条件である。

### R-02: 共有package変更が本番deploy判定から漏れる

- [`deploy.yml`](../../.github/workflows/deploy.yml#L48)

Backend/Web/Adminの変更検出が各`apps/*`中心で、実行コードとしてbundleされる`packages/**`を含まない。共有domain、sync-engine、frontend-sharedだけを変更した場合、CIは新コードで成功しても本番artifactが更新されない。

Tail Workerにもrelease deploy jobがない。

### R-03: release candidateが確定していない

`origin/release`のheadは2026-05-15で、`master`にのみ存在するコミットが37件ある。SDK 57更新を含む現在のコードを、どのcommit・binary・migrationの組み合わせで公開するかがまだ固定されていない。

## 4. Backend API分析

### A-01: 従量AI APIにquota・同時実行制限がない（soft quotaで解消）

- [`aiActivityLogRoute.ts`](../../apps/backend/feature/aiActivityLog/aiActivityLogRoute.ts#L60)

`premiumMiddleware`は契約資格を確認するだけで、ユーザー別回数制限、月次quota、同時実行数制限がない。有効なpremiumアカウントまたはvoice scopeのAPI keyから、契約収入を超えるOpenRouter費用を発生させられる。

2026-07-14までにユーザー/API key別の分・日・月quotaと構造化usage記録を追加した。KVでは厳密に保証できず、DOでは通常経路の遅延が費用便益に見合わないため、同時実行数制限は不採用とした。金銭上のhard capはprovider側の予算上限と利用量アラートで管理する。

### A-02: rate limitが並列リクエストに対してatomicではない（残存リスクを受容）

- [`rateLimitMiddleware.ts`](../../apps/backend/middleware/rateLimitMiddleware.ts#L45)

Cloudflare KVに対して`get → ローカル加算 → fire-and-forget set`を行う。並列リクエストが同じcountを読めるため、login、register、token、Webhook等の制限を超えて処理され得る。

2026-07-14の再評価では、個人向けアプリの低額なAPI呼び出しと多層防御用rate limitに対し、既知の500〜1,000msのDOコールドスタートを通常経路へ再導入するのは比例しないと判断した。Workers KVの制限はsoft limitとし、並列burstによる超過を残存リスクとして受容する。ストア未設定・読み取り不能時のproduction/stg fail-closeは維持し、AI利用額のhard capはprovider側の予算上限と利用量アラートで管理する。

Workers KVには同一キー毎秒1回の書き込み上限もある。短時間の連続要求では非同期`put`が失敗し、カウンターが保存済みsnapshotから進まないことで追加の過剰許可が発生し得る。書き込み失敗を構造化エラーとしてWAEへ記録し、この劣化を明示的な残存リスクとして受容する。

### A-03: 課金Webhookの新旧判定がない

- [`subscriptionCommandUsecase.ts`](../../apps/backend/feature/subscription/subscriptionCommandUsecase.ts#L62)

Webhook IDの重複は防ぐが、イベント発生時刻・期間・状態遷移を比較していない。異なるIDの古いrenewal/activeがexpiration/revokedより遅く届くと、premiumを再付与し得る。逆順では支払済みユーザーをfreeへ戻し得る。

### A-04: 本番課金設定のpreflightが不足している

release workflowは以下を投入・検証しない。

- `POLAR_WEBHOOK_SECRET`
- `POLAR_ACCESS_TOKEN`
- `POLAR_PRICE_ID`
- `REVENUECAT_WEBHOOK_AUTH_KEY`

手動設定済みなら動作する可能性はあるが、repositoryのrelease workflowだけでは本番環境を再現できない。

### APIの良い点

- route → handler → usecase → repository/queryServiceの層構造は概ね一貫
- 主要CRUD/syncでuserId所有権を検証
- JWT audienceを検証
- API keyはhash保存され、scopeが分離されている
- Polar/RevenueCat Webhookは署名または共有鍵を検証
- Zodによる入力検証が広く適用されている

## 5. Web / Admin Web分析

### W-01: オフライン同期の恒久reject

R-01と同じ問題により、Webで作成・変更したActivity/Kindがサーバーへ届かなくなる経路がある。

### W-02: Admin tokenの防御水準が一般Webより低い

- [`useAdminAuth.ts`](../../apps/admin-frontend/src/hooks/useAdminAuth.ts#L45)

8時間有効の管理者Bearer tokenを`sessionStorage`へ保存する。logoutはブラウザ保存を消すだけで、サーバー側revokeはない。XSSや端末共有時の影響はユーザー削除・subscription変更まで及ぶ。

### W-03: 本番だけで有効になる課金導線のE2Eが不足

`VITE_ENABLE_WEB_SUBSCRIPTION=true`のときだけ有効になるWeb課金導線について、production相当のE2Eがない。Polar checkout、redirect、Webhook反映、plan再取得の一連の競合を検証できていない。

### W-04: 初期bundleが大きい

Web production buildは成功したが、メインJSは約1.9 MB、gzip後約521 KBで、Viteのchunk size warningが出た。直接の審査阻止条件ではないが、初回表示とPWA precacheへの影響を計測する必要がある。

### Webの良い点

- production PWA build成功
- Web E2E 134件成功
- 一般ユーザーのrefresh tokenはHttpOnly cookie
- access tokenはメモリ保持
- Dexieを中心としたoffline-first構造は一貫している

## 6. Mobile分析

### M-01: Android無料ユーザーが最初のWidgetを設定できない

- [`WidgetPlanHelper.kt`](../../apps/mobile/modules/timer-widget/android/src/main/java/com/actiko/widget/WidgetPlanHelper.kt#L24)
- [`WidgetConfigActivity.kt`](../../apps/mobile/modules/timer-widget/android/src/main/java/com/actiko/widget/WidgetConfigActivity.kt#L32)

設定Activityは新しいwidget IDを保存する前に`isWidgetAllowed`を呼ぶ。無料プランでは保存済みIDの先頭1件しか許可しないため、空集合に対する初回設定が必ず拒否される。Timer / Counter / Check / Binaryすべてに影響する。

### M-02: iOSの複数Timer Widgetが別Activityへ誤記録する

- [`TimerState.swift`](../../apps/mobile/targets/widget/TimerState.swift#L19)

選択Activityを全Widget共通の`configured_activity_id`へ保存している。複数WidgetをActivity A/Bへ設定すると最後の設定で上書きされ、A側の操作がBのタイマー・ログへ作用し得る。

### M-03: iOS WidgetのKeychain sharing entitlementが不足

- [`VoiceApiKeyHelper.swift`](../../apps/mobile/targets/widget/VoiceApiKeyHelper.swift#L26)
- [`generated.entitlements`](../../apps/mobile/targets/widget/generated.entitlements#L5)

Widgetは`kSecAttrAccessGroup`を指定するが、entitlementにはApp Groupしかなく、`keychain-access-groups`がない。署名済み実機では音声記録用API keyを取得できない可能性が高い。

### M-04: Androidのexported componentから認証付きAPIを実行できる

- [`app.plugin.js`](../../apps/mobile/modules/timer-widget/app.plugin.js#L100)
- [`VoiceRecordActivity.kt`](../../apps/mobile/modules/timer-widget/android/src/main/java/com/actiko/widget/VoiceRecordActivity.kt#L24)

`VoiceRecordActivity`がexportedで、外部由来のURI/extraに含まれる`speechText`を受け取り、保存済みBearer keyで記録APIを実行する。他アプリからの記録改ざんと従量AI API消費につながる。

AppWidgetProviderの独自actionもexported receiverで受け、呼出元検証やsignature permissionがない。

### M-05: Widgetの記録整合性とエラー処理

- Check Widgetは設定したkindIdを完了判定・取消対象の検索条件に使わない
- 異なるKindのログを完了扱い・soft deleteし得る
- Swiftは`sqlite3_step`、Androidは`db.insert`の失敗を呼出側へ返さない
- 保存失敗後もTimerをresetするため、未保存時間を失い得る

### M-06: Expo SDK 57のNative検証がない

現在の依存はExpo SDK 57 / React Native 0.86だが、EAS上の最新成功buildはSDK 55。Swift/Kotlin、config plugin、Widget、RevenueCatを含む現在の組み合わせはproduction compilerを通していない。

Expo Doctorは11パッケージのpatch mismatchを検出した。

### M-07: RevenueCat環境変数が不足

EAS production/preview環境に以下が登録されていない。

- `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS`
- `EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID`

この状態では購入SDKの初期化・offerings取得・購入・復元が成立しない。

### M-08: OTA runtime分離が不十分

- [`app.config.ts`](../../apps/mobile/app.config.ts#L66)

`runtimeVersion.policy`が`appVersion`で、versionは`1.0.0`のままである。SDK 55→57のNative ABI変更を含むため、今回の更新はOTAではなくNative buildが必要。今後もNative変更時にruntimeが確実に分離される仕組みが必要である。

### M-09: ストア公開準備が未完了

- [`mobile-release.md`](../todo/mobile-release.md#L163)

未完了項目には以下が含まれる。

- 説明文・カテゴリ・対象年齢
- iPhone/iPadスクリーンショット
- サポートURL・レビュー用アカウント
- Androidフィーチャーグラフィック・データセーフティ
- iOS/Android production build
- TestFlight / Play内部テスト
- ストア申請と最終確認

## 7. リリース判定をGoへ変更する条件

以下をすべて満たすまでNo-Goを維持する。

1. Web/Mobile同期の401・4xx・混在chunk処理を修正し、回帰テストを追加する
2. OpenRouterにユーザー/API key別soft quotaと観測を導入し、provider側で予算上限・利用量アラートを設定する
3. Workers KVのsoft limitと並列burstの残存リスクをADRへ記録し、provider側の予算上限・利用量アラートを外部チェック項目へ引き渡す
4. 課金Webhookにイベント順序・期間・許可状態遷移の検証を追加する
5. 共有package、migration、lockfileを含むdeploy変更検知へ修正する
6. Android/iOS Widgetの初回設定、複数配置、Kind判定、DB失敗処理を修正する
7. Android exported componentを非公開化するか、signature permission等で保護する
8. iOS Keychain sharing entitlementを正しく構成する
9. Expo SDK 57の依存を整合させ、audit結果を解消または明示的にrisk acceptする
10. RevenueCat/Polarの本番環境変数とWebhookをpreflightで検証する
11. Native変更に対応するruntime/versionを確定する
12. iOS/Android production buildを作成し、同一binaryを内部テストする
13. release commitでCI、Web E2E、Native smoke、主要課金・同期フローを成功させる
14. ストア素材・申告・審査情報を完成させる
15. rollback手順、監視、公開直後の確認担当を確定する

## 8. レビュアー判定

| 観点 | 判定 |
|---|---|
| Security | NOT LGTM |
| Logic / Bug | NOT LGTM |
| Architecture | APIのみLGTM、Web/MobileはNOT LGTM |
| Testability | NOT LGTM |
| Native | NOT LGTM |

総合判定は全観点を統合して **No-Go** とする。

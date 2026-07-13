# Actiko リリース前チェックリスト — コード・リポジトリ内

> 対象: コード、repository内設定、自動テスト、ローカルbuildで完了できる作業
> 外部作業: [外部サービス・配布チェックリスト](./pre-release-external-checklist.md)
> 判定根拠: [リリース可否評価レポート](../report/release-readiness-20260713.md)

## 完了条件

- P0が1件でも未完了ならrelease candidateを確定しない
- 各修正に正常系・異常系・境界値の回帰テストを追加する
- 外部APIはmock/fakeで検証し、実secretや実課金を使用しない
- コード側完了後、commit SHAと検証結果を外部チェックリストへ引き渡す

## P0-C01: データ同期

- [ ] Web/Mobileの`syncActivities`で401を恒久reject対象から外す
- [ ] 403を認証・権限エラーとして扱い、ローカルデータを保持する
- [ ] 408/409/425/429等の再試行可能な4xxを分類する
- [ ] validation error時にchunk全体ではなく不正レコードだけを隔離する
- [ ] API responseでレコード単位の失敗理由を返せるようにする
- [ ] `rejected`レコードを修復・再送できるrepository APIを用意する
- [ ] Webに「401後もpending/failedとして再送される」回帰テストを追加する
- [ ] Mobileに同じ回帰テストを追加する
- [ ] 1件の400が正常なActivity/Kindを巻き込まないテストを追加する
- [ ] 429後にbackoffして再送するテストを追加する
- [ ] token refresh失敗後の再認証で同期が再開するテストを追加する
- [ ] rejected/failed/pendingの状態遷移を共通仕様として文書化する
- [ ] 同期失敗・rejected件数をerror reporterへ送れるようにする
- [ ] Mobile起動時に`loadStorageCache()`を確実に呼ぶ
- [ ] Mobile再起動後にwatermark/bootstrapped resourcesが復元されるテストを追加する

## P0-C02: AI APIのコスト防御

- [ ] OpenRouter呼び出しへユーザー単位の分・日・月quotaを追加する
- [ ] API key単位のquotaを追加する
- [ ] AI APIへ同時実行数制限を追加する
- [ ] speechTextのサイズ・頻度上限を再確認する
- [ ] quota超過時に429と安定したエラー形式を返す
- [ ] 利用量、失敗率、model、推定token数を構造化記録する
- [ ] AI quotaの正常系テストを追加する
- [ ] quota境界値テストを追加する
- [ ] 並列実行で上限を超えないテストを追加する
- [ ] API key経由と一般認証経由の両方をテストする
- [ ] OpenRouter失敗時に記録データを壊さないことをテストする

## P0-C03: rate limit・認証

- [ ] Cloudflare KVのread-modify-write方式を強整合なrate limitへ置き換える
- [ ] loginの並列超過テストを追加する
- [ ] registerの並列超過テストを追加する
- [ ] refresh tokenの並列超過テストを追加する
- [ ] contactの並列超過テストを追加する
- [ ] webhookの並列超過テストを追加する
- [ ] rate limit store利用不能時のproduction fail-closeをテストする
- [ ] OAuth専用アカウントと存在しないアカウントのloginエラーを統一する
- [ ] stgの500 responseからstack traceを除外する
- [ ] 旧SHA-256 passwordでlogin成功した際にbcryptへ再hashする
- [ ] password hash移行の回帰テストを追加する
- [ ] logout後のaccess token残存リスクを仕様化し、TTL短縮またはrevoke方式を確定する
- [ ] `(provider, provider_account_id)`の一意性をDB schemaで保証する
- [ ] OAuth identityの並行login/linkテストを追加する

## P0-C04: 課金・entitlementロジック

- [ ] RevenueCat event schemaへイベント発生時刻または順序情報を取り込む
- [ ] Polar event schemaへイベント発生時刻または順序情報を取り込む
- [ ] subscription更新時に古いイベントを拒否する
- [ ] 許可するsubscription状態遷移を型・コードで表現する
- [ ] expiration後に遅延renewalが届くテストを追加する
- [ ] purchase後に遅延revokeが届くテストを追加する
- [ ] 同時に異なるWebhookが届く競合テストを追加する
- [ ] Polarのtrialingで`trialEnd`とbackend entitlementを一致させる
- [ ] active状態でも`currentPeriodEnd`を検証する
- [ ] RevenueCat購入後、backend反映までpoll/backoffする
- [ ] RevenueCat復元後も同じ再照合を行う
- [ ] backendが旧planを正常応答した場合も再試行する
- [ ] foreground復帰時に`auth_state.plan`を最新値へ保存する
- [ ] Pro→Free downgradeをforeground中に反映するテストを追加する
- [ ] Free→Pro upgradeがWebhook遅延後に自動反映されるテストを追加する
- [ ] Web checkout redirect後にsubscriptionを再照合する
- [ ] checkout success queryの処理を実装する
- [ ] Polar checkout gatewayのrequest/response契約テストを追加する

## P0-C05: Android Native Widget・外部Intent

- [ ] 初回Widget設定では`canAddWidget`相当を使う
- [ ] 未保存widget IDを無料枠の1個目として許可する
- [ ] Timer Configの初回設定テストを追加する
- [ ] Counter Configの初回設定テストを追加する
- [ ] Check Configの初回設定テストを追加する
- [ ] Binary Configの初回設定テストを追加する
- [ ] Pro→Free時に1個だけ残す仕様をテストする
- [ ] `VoiceRecordActivity`を非exportedにできる呼出方式へ変更する
- [ ] exportedが不可避ならsignature permissionで保護する
- [ ] AppWidgetProviderの独自actionを外部broadcastから保護する
- [ ] Binary WidgetのkindIdが対象Activityに属することを検証する
- [ ] Counterのstepをallowlistまたは範囲検証する
- [ ] widget IDが実際に登録済みか検証する
- [ ] 外部からの明示Intent/broadcastを拒否するinstrumentation testを追加する

## P0-C06: iOS Native Widget・Keychain

- [ ] Timer Widgetの選択ActivityをWidgetインスタンス単位で保持する
- [ ] AppIntentへ対象Activity IDを安全に引き渡す
- [ ] Start/Pause/Stop/Reset/SaveWithKindで同じActivity IDを使用する
- [ ] 複数Timer Widgetが相互干渉しないテスト可能な構造へ変更する
- [ ] Main appのentitlementへ正しい`keychain-access-groups`を生成する
- [ ] Widget targetのentitlementへ同じKeychain access groupを生成する
- [ ] App Group IDをKeychain access groupとして誤用しない
- [ ] bundle ID別にApp Group/Keychain groupを生成する
- [ ] `AppConfig.appGroupId`のhardcodeをbuild configから生成する
- [ ] Keychain queryをunit test可能なadapterへ分離する
- [ ] Timer timelineの`.never`運用を再評価する
- [ ] Activity名・削除・plan変更時にWidget timelineをreloadする橋渡しを追加する

## P0-C07: Widgetのログ整合性

- [ ] Check Widgetの完了判定へkindIdを含める
- [ ] Check Widgetの取消対象へkindIdを含める
- [ ] iOS/Androidで異なるKindのログを誤削除しないテストを追加する
- [ ] Swiftの`sqlite3_step`戻り値を検査する
- [ ] SwiftのSQLite bindへ`SQLITE_TRANSIENT`相当を使用する
- [ ] Androidの`db.insert == -1`を失敗として扱う
- [ ] DB lockを失敗として呼出側へ返す
- [ ] constraint violationを失敗として呼出側へ返す
- [ ] 保存成功時だけTimer stateをresetする
- [ ] 失敗時に経過時間を保持する
- [ ] WidgetのDB schema参照を自動検査へ追加する
- [ ] React Native/Swift/Kotlinのschema version整合をテストする

## P0-C08: CI/CD定義・artifact整合性

- [ ] Backend変更検出へBackendが利用する`packages/**`を追加する
- [ ] Web変更検出へ`packages/frontend-shared`、`packages/sync-engine`、`packages/domain`等を追加する
- [ ] Admin Webの実依存を変更検出へ追加する
- [ ] lockfile変更時に影響する全artifactを再buildする
- [ ] root build config変更時に影響する全artifactを再buildする
- [ ] schema/migration変更時にBackend deploy flagも有効にする
- [ ] Tail Workerのstg/prod deploy jobを定義する
- [ ] 変更検出ルールのfixture testを追加する
- [ ] Mobile release jobで`ci-check`を必須にする
- [ ] Mobile release jobでiOS/Android bundle生成を必須にする
- [ ] production OTA/buildをrelease branchの承認済みSHAに限定する
- [ ] Mobile operationが`ota`の場合にNative差分を検出して拒否する
- [ ] release pushでWeb E2Eを実行する
- [ ] release jobへpost-deploy smokeの定義を追加する
- [ ] workflow内でrequired variable名だけをpreflightする
- [ ] secret値がlogへ出ないことを確認する

## P1-C09: Mobile依存・runtime設定

- [ ] Expo Doctorが示した11パッケージをSDK 57推奨patchへ揃える
- [ ] `pnpm audit --prod`のhigh 5件を解消する
- [ ] moderate 2件を解消するかrisk acceptanceをrepositoryへ記録する
- [ ] `pnpm install --frozen-lockfile`が成功することを確認する
- [ ] Expo SDK 57 / RN 0.86の採用ADRを更新する
- [ ] `runtimeVersion`の運用方針を確定する
- [ ] SDK 55→57を既存runtimeから分離する
- [ ] Native依存変更時にapp version/runtimeを更新するguardを追加する
- [ ] OTA可能/不可を自動判定するscriptを追加する
- [ ] `app.config.ts`のrequired env名をvalidationする
- [ ] production configにplaceholder/default bundle IDが混入しないようにする
- [ ] Admin WebがVite等の直接依存を宣言し、workspace外のstale binaryへ依存しないようにする

## P1-C10: Web / Admin Webセキュリティ・性能

- [ ] Admin tokenをsessionStorageからメモリまたは失効可能なsession方式へ移行する
- [ ] Admin logoutでサーバー側session/tokenをrevokeする
- [ ] `ADMIN_ALLOWED_EMAILS`変更後に既発行tokenを無効化できるようにする
- [ ] Admin tokenの8時間TTLを短縮または明示的にrisk acceptする
- [ ] Admin WebへCSPを定義する
- [ ] Admin Webへ`frame-ancestors`またはX-Frame-Optionsを定義する
- [ ] Admin WebへPermissions-Policyを定義する
- [ ] Web本体にも適切なCSP/anti-framing policyを定義する
- [ ] Web bundleをcode splitするか、現状サイズの根拠を記録する
- [ ] production相当の`VITE_ENABLE_WEB_SUBSCRIPTION=true`でE2Eを実行できるようにする

## P1-C11: 自動検証

- [ ] `pnpm run ci-check`を成功させる
- [ ] unit/integration test数が基準値を下回っていないことを確認する
- [ ] `pnpm run test-e2e`を成功させる
- [ ] Web production buildをdummy production envで成功させる
- [ ] Admin Web production buildをdummy production envで成功させる
- [ ] Mobile iOS bundleをdummy production envで生成する
- [ ] Mobile Android bundleをdummy production envで生成する
- [ ] Mobile unit testを成功させる
- [ ] offline flowでserver uploadまで検証するローカルE2Eを追加する
- [ ] 別clientでdownloadする同期E2Eを追加する
- [ ] RevenueCat→Webhook→plan反映をmock統合テストする
- [ ] Polar→Webhook→plan反映をmock統合テストする
- [ ] Native Widgetのplan gateを自動テストする
- [ ] Native WidgetのDB書き込み失敗を自動テストする
- [ ] Tail Workerのlog parse/write testを追加する
- [ ] release workflowの変更検出testを成功させる

## P1-C12: release candidateのrepository内準備

- [ ] `master`と`release`の差分・分岐履歴を整理する
- [ ] releaseへ取り込むcommitを確定する
- [ ] 対象migration一覧をrepositoryへ記録する
- [ ] Mobile version / build number / runtimeVersionを更新する
- [ ] release noteを現在の実装へ更新する
- [ ] rollback/forward-fix方針を文書化する
- [ ] DB migrationがexpand-compatibleであることを確認する
- [ ] API/Web/Mobileの互換性matrixを記録する
- [ ] release candidate tag命名規則を確定する
- [ ] コード側チェック完了commit SHAを記録する

## コード側最終確認

- [ ] P0-C01〜C08がすべて完了している
- [ ] P1-C09〜C12のrelease必須項目が完了している
- [ ] Security reviewがLGTM
- [ ] Logic reviewがLGTM
- [ ] Architecture reviewがLGTM
- [ ] Testability reviewがLGTM
- [ ] Native reviewがLGTM
- [ ] `git diff --check`が成功する
- [ ] release candidate SHAでCIが成功する
- [ ] 外部チェックリストへcommit SHA、migration、runtime、検証結果を引き渡す

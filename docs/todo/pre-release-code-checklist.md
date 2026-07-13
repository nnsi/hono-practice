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

- [x] Web/Mobileの`syncActivities`で401を恒久reject対象から外す
- [x] 403を認証・権限エラーとして扱い、ローカルデータを保持する
- [x] 408/409/425/429等の再試行可能な4xxを分類する
- [x] validation error時にchunk全体ではなく不正レコードだけを隔離する
- [x] API responseでレコード単位の失敗理由を返せるようにする
- [x] `rejected`レコードを修復・再送できるrepository APIを用意する
- [x] Webに「401後もpending/failedとして再送される」回帰テストを追加する
- [x] Mobileに同じ回帰テストを追加する
- [x] 1件の400が正常なActivity/Kindを巻き込まないテストを追加する
- [x] 429後にbackoffして再送するテストを追加する
- [x] token refresh失敗後の再認証で同期が再開するテストを追加する
- [x] rejected/failed/pendingの状態遷移を共通仕様として文書化する
- [x] 同期失敗・rejected件数をerror reporterへ送れるようにする
- [x] Mobile起動時に`loadStorageCache()`を確実に呼ぶ
- [x] Mobile再起動後にwatermark/bootstrapped resourcesが復元されるテストを追加する

## P0-C02: AI APIのコスト防御

- [x] OpenRouter呼び出しへユーザー単位の分・日・月quotaを追加する
- [x] API key単位のquotaを追加する
- [x] AI APIの同時実行数制限は、低い超過費用に対してKVで保証できずDOでは遅延が大きいため不採用とし、ADRへ記録する
- [x] speechTextのサイズ・頻度上限を再確認する
- [x] quota超過時に429と安定したエラー形式を返す
- [x] 利用量、失敗率、model、推定token数を構造化記録する
- [x] AI quotaの正常系テストを追加する
- [x] quota境界値テストを追加する
- [x] Memory/Redisで並列境界テストを追加し、Workers KVでは厳密な並列上限を保証しないことをADRへ記録する
- [x] API key経由と一般認証経由の両方をテストする
- [x] OpenRouter失敗時に記録データを壊さないことをテストする

## P0-C03: rate limit・認証

- [x] Cloudflare Workers KVの結果整合性をsoft limitとして受容し、application-owned portとKV/Redisアダプターへ分離する
- [x] Workers KVの同一キー毎秒1書き込み制限による過剰許可をADRへ記録し、非同期書き込み失敗の観測と回帰テストを追加する
- [x] loginの境界値・キー分離テストを追加する
- [x] registerの境界値・キー分離テストを追加する
- [x] refresh tokenの境界値・キー分離テストを追加する
- [x] contactの境界値・キー分離テストを追加する
- [x] webhookの境界値・キー分離テストを追加する
- [x] rate limit store利用不能時のproduction fail-closeをテストする
- [x] OAuth専用アカウントと存在しないアカウントのloginエラーを統一する
- [x] stgの500 responseからstack traceを除外する
- [x] 旧SHA-256 passwordでlogin成功した際にbcryptへ再hashする
- [x] password hash移行の回帰テストを追加する
- [x] logout後のaccess token残存リスクを仕様化し、TTL短縮またはrevoke方式を確定する
- [x] `(provider, provider_account_id)`の一意性をDB schemaで保証する
- [x] OAuth identityの並行login/linkテストを追加する

## P0-C04: 課金・entitlementロジック

- [x] RevenueCat event schemaへイベント発生時刻または順序情報を取り込む
- [x] Polar event schemaへイベント発生時刻または順序情報を取り込む
- [x] subscription更新時に古いイベントを拒否する
- [x] 許可するsubscription状態遷移を型・コードで表現する
- [x] expiration後に遅延renewalが届くテストを追加する
- [x] purchase後に遅延revokeが届くテストを追加する
- [x] 同時に異なるWebhookが届く競合テストを追加する
- [x] Polarのtrialingで`trialEnd`とbackend entitlementを一致させる
- [x] active状態でも`currentPeriodEnd`を検証する
- [x] RevenueCat購入後、backend反映までpoll/backoffする
- [x] RevenueCat復元後も同じ再照合を行う
- [x] backendが旧planを正常応答した場合も再試行する
- [x] foreground復帰時に`auth_state.plan`を最新値へ保存する
- [x] Pro→Free downgradeをforeground中に反映するテストを追加する
- [x] Free→Pro upgradeがWebhook遅延後に自動反映されるテストを追加する
- [x] Web checkout redirect後にsubscriptionを再照合する
- [x] checkout success queryの処理を実装する
- [x] Polar checkout gatewayのrequest/response契約テストを追加する

## P0-C05: Android Native Widget・外部Intent

- [x] 初回Widget設定では`canAddWidget`相当を使う
- [x] 未保存widget IDを無料枠の1個目として許可する
- [x] Timer Configの初回設定テストを追加する
- [x] Counter Configの初回設定テストを追加する
- [x] Check Configの初回設定テストを追加する
- [x] Binary Configの初回設定テストを追加する
- [x] Pro→Free時に1個だけ残す仕様をテストする
- [x] `VoiceRecordActivity`を非exportedにできる呼出方式へ変更する
- [x] exportedが不可避ならsignature permissionで保護する（`VoiceRecordActivity`を非exported化したため該当なし）
- [x] AppWidgetProviderの独自actionを外部broadcastから保護する
- [x] Binary WidgetのkindIdが対象Activityに属することを検証する
- [x] Counterのstepをallowlistまたは範囲検証する
- [x] widget IDが実際に登録済みか検証する
- [x] 外部からの明示Intent/broadcastを拒否するinstrumentation testを追加する

## P0-C06: iOS Native Widget・Keychain

- [x] Timer Widgetの選択ActivityをWidgetインスタンス単位で保持する
- [x] AppIntentへ対象Activity IDを安全に引き渡す
- [x] Start/Pause/Stop/Reset/SaveWithKindで同じActivity IDを使用する
- [x] 複数Timer Widgetが相互干渉しないテスト可能な構造へ変更する
- [x] Main appのentitlementへ正しい`keychain-access-groups`を生成する
- [x] Widget targetのentitlementへ同じKeychain access groupを生成する
- [x] App Group IDをKeychain access groupとして誤用しない
- [x] bundle ID別にApp Group/Keychain groupを生成する
- [x] `AppConfig.appGroupId`のhardcodeをbuild configから生成する
- [x] Keychain queryをunit test可能なadapterへ分離する
- [x] Timer timelineの`.never`運用を再評価する
- [x] Activity名・削除・plan変更時にWidget timelineをreloadする橋渡しを追加する

## P0-C07: Widgetのログ整合性

- [x] Check Widgetの完了判定へkindIdを含める
- [x] Check Widgetの取消対象へkindIdを含める
- [x] iOS/Androidで異なるKindのログを誤削除しないテストを追加する
- [x] Swiftの`sqlite3_step`戻り値を検査する
- [x] SwiftのSQLite bindへ`SQLITE_TRANSIENT`相当を使用する
- [x] Androidの`db.insert == -1`を失敗として扱う
- [x] DB lockを失敗として呼出側へ返す
- [x] constraint violationを失敗として呼出側へ返す
- [x] 保存成功時だけTimer stateをresetする
- [x] 失敗時に経過時間を保持する
- [x] WidgetのDB schema参照を自動検査へ追加する
- [x] React Native/Swift/Kotlinのschema version整合をテストする

## P0-C08: CI/CD定義・artifact整合性

- [x] Backend変更検出へBackendが利用する`packages/**`を追加する
- [x] Web変更検出へ`packages/frontend-shared`、`packages/sync-engine`、`packages/domain`等を追加する
- [x] Admin Webの実依存を変更検出へ追加する
- [x] lockfile変更時に影響する全artifactを再buildする
- [x] root build config変更時に影響する全artifactを再buildする
- [x] schema/migration変更時にBackend deploy flagも有効にする
- [x] Tail Workerのstg/prod deploy jobを定義する
- [x] 変更検出ルールのfixture testを追加する
- [x] Mobile release jobで`ci-check`を必須にする
- [x] Mobile release jobでiOS/Android bundle生成を必須にする
- [x] production OTA/buildをrelease branchの承認済みSHAに限定する
- [x] Mobile operationが`ota`の場合にNative差分を検出して拒否する
- [x] release pushでWeb E2Eを実行する
- [x] release jobへpost-deploy smokeの定義を追加する
- [x] workflow内でrequired variable名だけをpreflightする
- [x] secret値がlogへ出ないことを確認する

## P1-C09: Mobile依存・runtime設定

- [x] Expo Doctorが示した11パッケージをSDK 57推奨patchへ揃える
- [x] `pnpm audit --prod`のhigh 5件を解消する（最終結果: high 0件）
- [x] moderate 2件を解消するかrisk acceptanceをrepositoryへ記録する（risk acceptance記録済み）
- [x] `pnpm install --frozen-lockfile`が成功することを確認する
- [x] Expo SDK 57 / RN 0.86の採用ADRを更新する
- [x] `runtimeVersion`の運用方針を確定する
- [x] SDK 55→57を既存runtimeから分離する
- [x] Native依存変更時にapp version/runtimeを更新するguardを追加する
- [x] OTA可能/不可を自動判定するscriptを追加する
- [x] `app.config.ts`のrequired env名をvalidationする
- [x] production configにplaceholder/default bundle IDが混入しないようにする
- [x] Admin WebがVite等の直接依存を宣言し、workspace外のstale binaryへ依存しないようにする

## P1-C10: Web / Admin Webセキュリティ・性能

- [x] Admin tokenをsessionStorageからメモリまたは失効可能なsession方式へ移行する
- [x] Admin logoutでサーバー側session/tokenをrevokeする
- [x] `ADMIN_ALLOWED_EMAILS`変更後に既発行tokenを無効化できるようにする
- [x] Admin tokenの8時間TTLを短縮または明示的にrisk acceptする
- [x] Admin WebへCSPを定義する
- [x] Admin Webへ`frame-ancestors`またはX-Frame-Optionsを定義する
- [x] Admin WebへPermissions-Policyを定義する
- [x] Web本体にも適切なCSP/anti-framing policyを定義する
- [x] Web bundleをcode splitするか、現状サイズの根拠を記録する
- [x] production相当の`VITE_ENABLE_WEB_SUBSCRIPTION=true`でE2Eを実行できるようにする

## P1-C11: 自動検証

- [x] `pnpm run ci-check`を成功させる
- [x] unit/integration test数が基準値を下回っていないことを確認する
- [x] `pnpm run test-e2e`を成功させる
- [x] Web production buildをdummy production envで成功させる
- [x] Admin Web production buildをdummy production envで成功させる
- [x] Mobile iOS bundleをdummy production envで生成する
- [x] Mobile Android bundleをdummy production envで生成する
- [x] Mobile unit testを成功させる
- [x] offline flowでserver uploadまで検証するローカルE2Eを追加する
- [x] 別clientでdownloadする同期E2Eを追加する
- [x] RevenueCat→Webhook→plan反映をmock統合テストする
- [x] Polar→Webhook→plan反映をmock統合テストする
- [x] Native Widgetのplan gateを自動テストする
- [x] Native WidgetのDB書き込み失敗を自動テストする
- [x] Tail Workerのlog parse/write testを追加する
- [x] release workflowの変更検出testを成功させる

## P1-C12: release candidateのrepository内準備

- [x] `master`と`release`の差分・分岐履歴を整理する
- [x] releaseへ取り込むcommitを`b5558b117214fbfee0e9a35c788240fa8984c4f4`に確定する
- [x] 対象migration一覧をrepositoryへ記録する
- [x] Mobile version / runtimeVersionを`1.1.0`へ更新し、EAS管理のbuild numberは外部確認へ分離する
- [x] release noteを現在の実装へ更新する
- [x] rollback/forward-fix方針を文書化する
- [x] DB migrationがexpand-compatibleであることを確認する
- [x] API/Web/Mobileの互換性matrixを記録する
- [x] release candidate tag命名規則を確定する
- [x] コード側チェック完了commit SHA `b5558b117214fbfee0e9a35c788240fa8984c4f4`を記録する

## コード側最終確認

- [x] P0-C01〜C08がすべて完了している
- [x] P1-C09〜C12のrelease必須項目が完了している
- [x] Security reviewがLGTM
- [x] Logic reviewがLGTM
- [x] Architecture reviewがLGTM
- [x] Testability reviewがLGTM
- [x] Native reviewがLGTM
- [x] `git diff --check`が成功する
- [x] release candidate SHAでCIが成功する
- [x] 外部チェックリストへcommit SHA、migration、runtime、検証結果を引き渡す

# RevenueCat ローカル確認

RevenueCat未設定から、購入・Webhook・アプリのプラン反映を確認するための手順。previewが本番DBへ接続しているため、previewへのOTAで検証用キーやAPI URLを配らない。ローカル専用アカウントと隔離DBを使う。Polarは今回の対象外。

## 構成

```text
専用simulatorのdevelopment client
  ├─ ローカルAPI :3546 → メモリ内PGlite（migration適用済み）
  └─ RevenueCat Test Store（専用project）
       └─ SANDBOX Webhook → HTTPS tunnel → :3547/webhooks/revenuecat
                                            └─ 同じPGlite → subscription更新
アプリ → /users/subscription で再照合 → Premium/Free表示
```

`revenuecat-local.ts` は外部DATABASE_URLやbackendの.envを読み込まない。毎回新しいuser UUIDを作り、Freeから開始する。NODE_ENV=developmentで本物の認証・subscription判定を使い、E2EのPremiumモックは使わない。終了すると全データを破棄する。ローカルAPIから有料AIやPolarを呼び出すcredentialも設定しない。

Webhook専用ポートでは `POST /webhooks/revenuecat` だけを受け、認証やデータ操作のAPIは公開しない。新しい本番APIは追加していない。

## ローカルAPIを起動

repository rootで実行する。ポートが使用中なら既存サーバーを止めず、env側のポートを変更する。

```bash
mkdir -p tmp
cp scripts/revenuecat-local.env.example tmp/revenuecat.local.env
chmod 600 tmp/revenuecat.local.env
```

`tmp/revenuecat.local.env` のpasswordとWebhook keyを、それぞれランダムな値に変更する。passwordは16文字以上、keyは32文字以上。値をcommitやチャットへ貼らない。

```bash
node --env-file=tmp/revenuecat.local.env --import tsx scripts/revenuecat-local-server.ts
```

起動ログにAPI URL、Webhook URL、login ID、app_user_idが出る。passwordとkeyは表示しない。login IDは `revenuecat-local@example.com`。passwordはenvに設定した値。

サーバーを再起動したらDBとuser UUIDが変わる。アプリ側もログアウトしてログインし直す。古いRevenueCat customerのイベントを新しいuserへ再送しない。

## RevenueCatを設定

本番と別の検証projectにTest Storeを作る。monthly subscription商品を作成し、entitlement `premium` へ紐付け、Current Offeringのpackageへ登録する。SDKの復元処理が `entitlements.active.premium` を読むため名前を合わせる。

Test Storeの公開API keyをローカルdevelopment clientの両プラットフォーム用変数に設定する。既存react-native-purchases 9.15.2はTest Store対応の最低版9.5.4以上。依存追加は不要。

**Test Storeはdebugビルドで使う。previewという配布名では判断しない。** RevenueCatはreleaseコンパイルされたアプリでTest Store keyを使うと停止させる。TestFlight/Play内部テストではplatform-specific keyとストアsandboxを使う。現在のpreviewをTest Store用に変更しない。

参照: [RevenueCat Test Store](https://www.revenuecat.com/docs/test-and-launch/sandbox/test-store)

## Webhookをローカルへ接続

既存のHTTPS tunnelツールで `http://127.0.0.1:3547` だけを転送する。例としてcloudflaredがインストール済みなら次の形で起動する。今回のDashboard接続検証では、このポートへのcloudflared quick tunnelを使用した。

```bash
cloudflared tunnel --url http://127.0.0.1:3547
```

RevenueCatのWebhook integrationには次を設定する。

- URL: `https://<tunnel-host>/webhooks/revenuecat`
- Authorization header: `Bearer <ローカルenvと同じWebhook key>`
- Environment filter: Sandboxのみ
- App filter: この検証用Test Storeのみ

DashboardのTestイベントは200を返すが、購入として扱わずDBを更新しない。Dashboard Testの成功だけでは購入経路の確認完了にしない。

本番のintegrationは別URL・別keyにし、Productionだけを送る。今回のbackend guardはNODE_ENV=productionでPRODUCTIONだけ、development/stg/testでSANDBOXだけを処理する。不一致は200+skippedで破棄し、environment欠落はTEST以外400。既存本番への適用は別途deploy後となる。

参照: [RevenueCat Webhooks](https://www.revenuecat.com/docs/integrations/webhooks)

## Mobileを接続

日常利用のpreviewとは別のsimulatorとdevelopment clientを使う。既存development clientにreact-native-purchasesが含まれ、チェックアウトとnative runtimeが一致していることを確認する。nativeモジュールがない場合は再buildが必要なので、先にnative変更・費用の承認を行う。2026-09-30には、ユーザー承認のもと依存を変更せずローカルiOS Debugビルドを作成した。EAS BuildやpreviewへのOTAは使用していない。

ローカルの専用env `tmp/revenuecat-mobile.env` を作る。BUNDLE_ID / EAS_PROJECT_ID / EAS_OWNERは対象development clientに対応する既存の値を設定する。そのほか以下を設定する。

```dotenv
EXPO_PUBLIC_API_URL=http://localhost:3546
EXPO_PUBLIC_API_URL_IOS=http://localhost:3546
EXPO_PUBLIC_API_URL_ANDROID=http://10.0.2.2:3546
EXPO_PUBLIC_API_URL_WEB=http://localhost:3546
EXPO_PUBLIC_REVENUECAT_API_KEY_IOS=test_<専用Test Store公開key>
EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID=test_<同じ公開key>
EXPO_PUBLIC_CONTACT_EMAIL=local@example.com
EXPO_PUBLIC_WEB_URL=http://localhost:2460
EXPO_PUBLIC_E2E_MODE=0
EXPO_NO_DOTENV=1
```

Expoの別.envやシェルに本番設定が残らないよう、専用envをexportしてから起動する。以下はrepository rootで実行する。Metroがすでに対象構成で動いている場合は再利用する。

```bash
set -a
source tmp/revenuecat-mobile.env
set +a
pnpm --filter actiko-mobile exec expo start --dev-client --clear --port 8083
```

iOS simulatorはlocalhost、Android emulatorは10.0.2.2を使う。実機ではRC_LAB_HOST=0.0.0.0を明示し、各API URLを開発PCのLAN IPへ変更する。実機のHTTP制限は既存binary次第なので、最初はsimulatorを使う。APIポートをtunnelへ公開しない。

専用アカウントでログインし、RevenueCat dashboardに起動ログと同じUUIDが現れることを確認してから購入する。日常利用のアカウント・SQLite・本番データは使わない。

## 確認する順序

1. Freeで開始し、Offeringと価格を取得できる。
2. Test Store購入成功 → dashboardにSANDBOX event → webhook 200 → ローカルsubscriptionがPremium → アプリもPremium。
3. 同一Webhookを再送して重複行や二重付与がない。
4. 復元後のCustomerInfoとbackend planが一致する。復元だけでは必ず新しいWebhookが来るとは限らないので、同じlab起動中・同じuserで行う。
5. 購入キャンセル・購入失敗でFreeのまま。
6. 期間内の解約で利用権を維持し、期限切れでFreeへ戻る。
7. 古いrenewalを再送して期限切れ状態が巻き戻らない。
8. 誤ったAuthorizationは401、PRODUCTION eventはskipped、他のAPIをWebhookポートで呼ぶと404。

## 検証済みと残件

自動テストは外部通信なしでmigration、本物のlogin、購入・重複・解約・期限切れ・逆順イベント、subscription APIの読み戻し、ポート用fetchの公開範囲を確認する。

```bash
pnpm exec vitest run scripts/revenuecat-local.test.ts apps/backend/feature/webhook/test/revenueCatWebhookEnvironment.test.ts
```

初回の自動テスト時点ではDashboard・SDK購入は未設定だった。後続のDashboard設定と実SDK検証結果は末尾を参照する。ローカルの疑似Webhook成功を実決済の統合成功とは扱わない。

BILLING_ISSUEで即Freeにする処理は修正済み。支払済み期間・grace periodの期限を利用し、BILLING_ERRORのCANCELLATIONが猶予期限を短縮しない。entitlement_idsにpremiumを含むイベントだけを処理する。返金はストアが報告する期限を反映し、auto-renew解除と混同しない。REFUND_REVERSEDとSUBSCRIPTION_EXTENDEDも期限を反映する。

### 復元ポリシー（ユーザー決定: 元アカウントに固定）

RevenueCat projectのRestore behaviorを **Keep with original App User ID** に設定する。Dashboard既定値のままにせず、Sandbox/本番で確認する。購入はActikoログイン後に実施し、同じActikoアカウントで復元する。別アカウントへの移管はサポートしない。

TRANSFERには成功応答を返さず503とエラーログを返す。RevenueCat側の移管をwebhookで取り消すことはできないため、発生した場合は設定と両顧客の権利を調査して手動で整合させる。通常の復元テストに加え、別Actikoアカウントで復元が拒否されることを実機確認する。サーバーのprovider ID所有者チェックも維持する。

参照: [RevenueCat復元ポリシー](https://www.revenuecat.com/docs/projects/restore-behavior)

参照: [RevenueCat event仕様](https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields)

## 2026年9月30日の検証結果

- `pnpm run ci-check`: 2,993 tests passed / 2 skipped、lint、全アプリの型チェック成功。
- `e2e/web/entitlement.test.ts`: 5 tests passed。Webのsubscription表示とWebhook反映を確認。
- scriptsは通常のtsc対象外なので、追加3ファイルを一時tsconfigで別途型チェックして成功。
- 専用サーバーを実ポートで起動し、login 200、Free subscription読出し、Webhookポートのlogin 404を確認。検証プロセスは終了済み。
- 本番DB、preview、外部tunnel、RevenueCat dashboard、native buildは変更していない。この初回検証の後、依存更新と課金ロジック修正を実施（下記）。

## 依存更新・課金修正後の検証

- audit: 全依存・prod指定とも全severity 0。
- RevenueCat関連: 71 tests passed。隔離PGliteでgrace→billing-error cancellation→返金→返金取消→失効のsubscription読戻しも確認。
- Web entitlement E2E: 5 tests passed。
- iOS/AndroidのExpo JS export: 成功。native build・ストア配送は未実施。
- 移管禁止は実装側の前提を明文化し、TRANSFERの警告・再送応答を検証。Dashboardの実設定は未実施。

- 全体テスト: fork poolで3,007 passed / 2 skipped。通常ci-checkはRosettaエラーで中断し、guard/lint/型チェックを個別に成功確認。


## Dashboard接続とローカルDebugビルド（2026-09-30）

ユーザーが作成したActiko project `f513074e` に、検証用のTest Storeだけを設定した。

| 設定 | 値 |
|---|---|
| Test Store app | `app2a8e10553b` |
| Product | `actiko_pro_monthly_dev` (`prodb8e66092f8`) |
| Entitlement | `premium` (`entl64de47bed8`) |
| Default/current Offering | `default` (`ofrng2f5d442aaa`) |
| Package | `$rc_monthly` |
| Restore behavior | Keep with original App User ID（Sandbox個別上書きなし） |
| Webhook | `whintgr5c8db427f5`、Sandbox only、Test Store only |

テスト商品は月額・USD 0.99。実際の請求は発生しない。公開SDK keyはgitignoredの `tmp/revenuecat-mobile.env`、Webhook keyとlab passwordは `tmp/revenuecat-dashboard.env` に保存する。Webhook欄はkeyだけではなく、必ず `Bearer <key>` を保存する。

専用Simulatorは `Actiko RevenueCat Dev`（iOS 26.5）。既存previewを上書きせず、依存追加・更新なし、EAS/OTAなしで生成した。ローカルbuild手順は次のとおり。

```bash
cd apps/mobile
EXPO_NO_DOTENV=1 CI=1 pnpm exec expo prebuild --platform ios --no-install --skip-dependency-update react-native,react
cd ios
EXPO_NO_DOTENV=1 pod install
EXPO_NO_DOTENV=1 xcodebuild \
  -workspace Actiko.xcworkspace -scheme Actiko -configuration Debug \
  -sdk iphonesimulator -destination 'platform=iOS Simulator,id=<専用SimulatorのUUID>' \
  -derivedDataPath ../build/revenuecat-debug \
  CODE_SIGN_IDENTITY=- CODE_SIGNING_ALLOWED=YES build
```

`CODE_SIGNING_ALLOWED=NO` ではKeychainに必要なentitlementが欠落し、ログイン時のSecureStore保存が失敗した。Simulator用のad-hoc署名を有効にするとログインできた。Apple Developerの配布証明書やEAS課金は不要。

Metroは `apps/mobile` から次で起動した。

```bash
node --env-file=../../tmp/revenuecat-mobile.env node_modules/expo/bin/cli start --dev-client --port 8083
```

現在のセッションではAPI 3546、Webhook 3547、Metro 8083を利用する。labの再起動でユーザーUUIDとDBが変わるため、検証途中では再起動しない。cloudflared quick tunnelのURLは起動ごとに変わり得るので、その都度Dashboardの宛先を更新する。日常利用や本番の常設WebhookにはこのURLを使わない。


### 実SDK検証の進捗

- ローカルDebug版からlabアカウントでログイン成功。RevenueCatのCustomer aliasとlabのuser UUIDが一致。
- current Offeringの `actiko_pro_monthly_dev` と価格 `$0.99 / 月` を取得・表示。
- Test StoreのCancelで購入画面へ戻り、subscription APIはFreeのまま。
- Test failed purchaseで再試行可能なエラー表示。subscription APIはFreeのまま。
- Test valid purchaseでRevenueCatのreceipt APIが200、Dashboardに `INITIAL_PURCHASE` と有効な `premium` 権限を確認。Webhook payloadのapp_user_idはlabのUUID、environmentはSANDBOX、storeはTEST_STORE。
- Webhook AuthorizationをユーザーがBearer形式へ修正。実際のDashboard TESTに `original_transaction_id: null` が含まれ400になったため、nullを未指定として正規化するよう修正し、回帰テストを追加。修正後はDashboard TESTが200/test-skip。
- 修正を反映してlabを再起動し、新規UUIDで再ログイン。実SDK購入 `1ea85974-6096-4273-86b6-97f20526ad5e` → RevenueCat配信Sent/200 → subscription API `plan: premium` / `status: active` → Simulatorの設定ページPro表示まで成功。
- Dashboardから読み取った実購入payloadをローカルWebhookへ2回再送し、どちらも200、プラン・有効期限が維持されることを確認。重複行防止は隔離DBの自動テストでも検証。
- 設定画面の「購入を復元」を実行し、CustomerInfoとbackend planの再照合後もProを維持。ただしSDKログは `Restoring purchases not available in Test Store. Returning current CustomerInfo.`。Test Storeでは実ストアレシートの復元・別アカウントでの復元拒否は検証できない。App Store / Google Play Sandboxで別途確認する。
- 初回の失敗購入イベントは、再起動で破棄した古いlabユーザーへの通知。Dashboardの古いRetrying表示を現在の購入失敗と混同しない。現在のユーザーは `2b13c0e3-8fc2-402d-a843-13bcc3663e85`。
- 自動RENEWALのWebhookも200。有効期限が `2026-09-30T14:50:57.571Z` から `14:55:57.571Z` に延長された。
- 更新通知の受信は `14:51:58.595Z`（直前の期限から約61秒後）。`14:51:24Z` のsubscription APIは一時的にFree、通知反映後はPremiumへ戻った。現在の実装はbackendに保存された期限を厳密に判定するため、遅延中も連続してPremiumを保証するものではない。実ストアSandboxで遅延を確認し、必要ならサーバー側RevenueCat再照合や明示的な猶予期間を別途設計する。テストの都合で有効期限を延ばす変更はしていない。
- 回帰テスト72件成功。iOS Debugビルド成功。`pnpm run ci-check` も成功：318 test files passed / 1 skipped、3,008 tests passed / 2 skipped、guard・lint・Web/Admin/Mobile型チェック成功。lintには既存の12 warningsが残る。
- 検証後もlocal API・Metro・Webhook tunnelは起動したまま。quick tunnelはこのMac上の検証専用であり、本番Webhookではない。lab停止・再起動時にはURLと新しいuser UUIDを確認し直す。

Test Storeで確認できるのはRevenueCatの開発用購入経路。App Store / Google Playの商品・platform-specific key・各store sandboxの検証は別途必要。

## 反映待ちの扱いと追加確認（2026-10-01）

購入SDKが成功した後にbackend再照合がタイムアウトした場合は、購入失敗と区別する。Mobileに「購入は受け付けられました・反映待ち」を表示し、その画面での再購入を無効にする。「購入を復元」で再照合でき、backendでPremiumが確認できるまでは権限を付与しない。復元SDKが有効な権限を返していてbackendだけが未反映の場合も、反映待ちとして案内する。日本語・英語の文言を追加。JSだけの変更でnative再ビルド・依存追加は不要。

専用cloudflaredを一時停止して実SDK購入を行い、約15.5秒の再照合後に青色の反映待ち表示・購入ボタン無効・復元ボタン有効をSimulatorで確認した。tunnel再開後、復元操作とbackend照合でProへ復旧。実課金・本番DBへの接続はない。

初回更新イベントをDashboardの実payloadで追加確認した。`purchased_at_ms=1790779857571`（14:50:57.571 UTC）、`event_timestamp_ms=1790779917906`（14:51:57.906 UTC）、配信14:51:58.595 UTC。約61秒の大半はRevenueCat側でイベントが生成されるまでの約60.3秒で、生成から配信までは約0.7秒。これだけで本番ストアでも同じ挙動になるとは判断しない。今回の案内修正は更新境界の一時的なFree判定そのものを解消する変更ではない。

実ストア復元の残件は承認待ちではなく設定不足。RevenueCatのAppsにはTest Storeのみで、App Store/Google Play appは未登録。App Store接続画面はIn-app purchase `.p8` key・Key ID・Issuer IDを要求し、workspace内に該当鍵ファイルはない。ストア商品とsandboxアカウントを用意してから、同じActikoアカウントでの復元、および別Actikoアカウントでの復元拒否を確認する。Test StoreのrestoreはCustomerInfoを返すだけなので、この確認を代替できない。

### 更新通知より早いRevenueCat APIとの照合

追加の同時観測では、15:24:04 UTC時点でRevenueCat REST APIは更新後の `15:28:58` を返していたが、backendはまだ旧期限 `15:23:58.416` のためFreeだった。この差を埋めるため、backendの `REVENUECAT_API_KEY` に同じprojectのSDK公開キーを設定すると、期限直後のRevenueCat契約をREST v1で再照合するようにした。管理用secret API keyは不要。

- 保存済みのpremium/active・自動更新解除なし・期限から5分以内のRevenueCat契約だけが対象。新規購入や明示的な返金・失効の代わりには使わない。
- 元のApp User ID一致、premiumの商品、sandbox/production一致、App Store/Play/Test Store種別、返金なし、有効期限を検証する。productionでTest Store keyは利用しない。
- 最大2秒で中断し、失敗時は保存済みの期限判定へ戻る。5秒・最大256件のキャッシュで同じ照会をまとめ、WebhookのDB revisionが変われば別の照会にする。
- 応答後にDBを再読出しし、その間に来た返金・失効・更新を優先する。外部照合結果はDBやWebhookの順序情報に書き込まない。
- `/user/me`、ログイン応答、`/users/subscription`、Premium middleware、APIキー認証が同じ判定を使う。WebとMobileの既存API形式は変更しない。
- キー未設定なら従来どおりのWebhookのみの動作。本番有効化には対応するplatform-specific SDK公開キーをbackendにも設定する。今回変更したのはローカル設定だけ。

これは一律の無料猶予期間ではなく、RevenueCatが確認した支払済み期限を参照する処理。RevenueCat自体が未更新の場合や到達不能の場合までProの連続利用を保証するものではない。

### 修正後の実購入・更新結果

local APIを修正版で再起動し、新規lab user `f343524c-b592-4e4b-8bb0-b134a3ad9ac8` でSimulatorから再ログイン・Test Store購入成功。今回の有効期限は15:39:19.743 UTC。

- 15:39:20.420 UTC、Webhook到着前にsubscription APIがRevenueCatへ再照合（外部照会381ms）、HTTP 200・Premium・APIキー利用可・新期限15:44:19.000を返した。
- 15:39:20.628 UTC、RENEWAL Webhookが200。その後はDB由来の15:44:19.743を返した。
- 10秒間隔の観測でこの更新境界をまたいだ全回答がPremium。SDKの復元操作でもPro表示を維持。単一更新の観測であり、全障害・全ストアでの連続利用を保証するものではない。
- `pnpm run ci-check` 成功：320 test files passed / 1 skipped、3,026 tests passed / 2 skipped。guard、lint、Web/Admin/Mobile型チェック成功。lintの既存12 warningsあり。
- 対象script（lab/server/従来test/更新test）は通常のtsc対象外なので一時tsconfigでも型チェックし成功。`git diff --check` 成功。
- 新規の単体・統合テストで環境/所有者/商品/期限/返金/異常応答、並行照会、DB revision別キャッシュ、照会中の失効、JWTとAPIキーの両経路を確認。DBの期限・Webhook順序情報が外部照合だけでは更新されないことも確認。

旧labユーザーは再起動で破棄済みなので、古いcustomerの通知が到着するとFKエラーとなる。現行UUIDの購入・更新イベントと区別する。今回の本番deploy・preview OTA・EAS Buildは実施していない。

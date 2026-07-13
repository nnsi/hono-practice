# 2026年7月リリース候補計画

## 対象範囲

このリリース候補では、初回ストアリリースに向けて、公開Web、Admin Web、Backend API、モバイル実行環境、ネイティブWidgetの実装を堅牢化する。対象のモバイルバージョンは`1.1.0`とし、Expo SDK 55 / アプリバージョン`1.0.0`のバイナリにはこの実行環境を配信してはならない。

## ブランチと履歴に関する決定

ハードニング作業前に記録した比較結果は次のとおり。

- マージ基点: `0afba36a26c6d2bf1d499bb46059c4c747d530cd`
- `origin/release`にのみ存在するコミット: 169件
- `origin/master`にのみ存在するコミット: 37件
- `git cherry origin/master origin/release`では、保持が必要なrelease固有のパッチは検出されなかった。左側の件数が多いのはマージ履歴の構造によるもの
- `origin/release`と`origin/master`のmerge-treeは、内容の競合なく完了した

したがって、リリース内容は現在の`master`にこの堅牢化変更を加えたものとする。`release`への統合には、通常の`master -> release`マージを使用する。releaseブランチのリセットや、37件のコミットの個別cherry-pickは行わない。

## データベースマイグレーション

共通のブランチ基点以降のマイグレーションは次のとおり。

| マイグレーション | 目的 | 互換性 |
|---|---|---|
| `0041_sync_pull_indexes.sql` | pull経路のインデックスを追加 | 追加のみ。旧クライアントと新クライアントの両方で安全 |
| `0042_fixed_gertrude_yorkes.sql` | クォータ、セッション、サブスクリプション順序、identityの制約 | 追加のみ。生成、適用、ローカル検証済み |

堅牢化用マイグレーションは、テーブル、カラム、インデックス、制約の追加に限定する。既存APIバイナリが読み取る項目の名前変更や削除は行わない。一意性制約には事前条件のクエリとテストを設け、既存の重複OAuth identityによってデプロイが暗黙に失敗しないようにする。

## デプロイと互換性マトリクス

| コンポーネント | 以前のデプロイ対象との互換性 | リリース条件 |
|---|---|---|
| 新DBスキーマ | 旧Backend | 互換。追加のみでexpand-compatible |
| 新Backend | 旧Web | 互換。同期失敗の詳細は追加項目で、既存レスポンス項目を維持 |
| 新Backend | 旧Mobile 1.0.0 | 既存API処理は互換。ネイティブ側の堅牢化は1.1.0まで利用不可 |
| 新Admin Web | 新Backend | 互換。認証が失効可能なセッションへ移行するため同時にデプロイ |
| 旧Admin Web | 新Backend | ロールバックの組み合わせとして非対応。BackendとAdminを一緒に戻すか前進修正する |
| Mobile 1.1.0 | 新Backend | 互換。Widget、Keychain、SDK 57の修正に必須 |
| 1.0.0バイナリへのMobile 1.1.0 OTA | 非互換 | runtime versionとワークフローのネイティブ差分ガードで拒否 |

デプロイ順序は、DBマイグレーション、Backend、Web/Admin/Tailの成果物、別途承認されたMobileバイナリの順とする。ストアへの段階的配信には、同じiOS/Androidリリース候補コミットを使用する。

## ロールバックと前進修正の方針

- Web、Admin Web、Backend、Tail Workerでは、直前のCloudflareバージョンを保持する。
- BackendとAdminの認証は、1つの互換性単位としてロールバックする。
- アプリケーションをロールバックする場合も、追加のみのDBマイグレーションは残す。インシデント対応中に破壊的なdown migrationは使用しない。
- 新しいDB-backed処理の不具合には、新しい処理経路を無効化するか、書き込まれたデータを保持したまま前進修正をデプロイして対応する。
- Mobile nativeの不具合が発生した場合は、ストアへの段階的配信を停止する。ネイティブコード、entitlement、config plugin、実行環境の不具合には代替ビルドが必要であり、OTAでは修正しない。
- JavaScriptのみのMobile不具合では、選択したnative build SHA以降にネイティブへ影響するファイルが変更されていないことをワークフローで証明できた場合に限り、OTAを使用できる。

## バージョンとタグの規則

- モバイルアプリのバージョンと実行環境: `1.1.0`
- EAS管理のiOSビルド番号とAndroid versionCode: 外部ビルドの証跡へ記録する。リポジトリのコードではリモートカウンターの値を推測しない
- リリース候補タグ: `actiko-v1.1.0-rc.1`、`actiko-v1.1.0-rc.2`、…
- 最終リリースタグ: `actiko-v1.1.0`

## ローカル検証の証跡

リリース候補の実装コミットは`dc09c6a85150596b267feb0e9a451bac78b8c3d8`。以下の最終`pnpm run ci-check`は、このコミットのコード差分に対して実行した。外部ビルドID、デプロイ実行URL、認証情報の確認は外部リリースチェックリストに残す。

- `pnpm run ci-check`: 233テストファイル / 2,402テスト、Biome、全TypeScriptプロジェクトが成功。実Redis統合テスト群も有効にして実行した。DB-backed PGliteテスト群は、CIのリソース競合を避けるため専用の直列実行プロジェクトで処理する。
- `pnpm run test-e2e`: ワーカーごとのPGliteインスタンスを使用し、20ファイル / 69テストが成功。
- Workers KV検証: unit 12件とMiniflare実KV統合1件が成功。結果整合性による並列超過、同一キー毎秒1書き込み制限による`put`失敗と追加許可、`waitUntil`への遅延書き込み、構造化エラー観測、旧single-record移行を確認した。
- Backend composition root検証: 実Redis Lua統合2件とWrangler staging dry-run bundleが成功。ブラウザから別IPで2回確認し、login失敗5回の残数が4から0へ減り、6回目がHTTP 429、`Retry-After: 900`になった。ログ上でもレート制限処理が`kvMs`へ記録された。
- 本番ビルド: WebとAdmin Webが成功。Webの最大chunkはentry 284.38kB、vendor 428.97kB。Adminのentryは283.43kB。
- 機密情報ではないダミー環境変数を使用したMobile本番exportがWebで成功。アーキテクチャ修正後にiOSとAndroidも再生成し、それぞれ4,681 / 4,769モジュール、両ネイティブプラットフォームのHermesバンドルは10MB。
- ネイティブ検証: Swift Widget実行テストと、全Widgetターゲットのソースに対するiOS 17 simulator型検査が成功。AndroidアプリのKotlinコンパイル、Widget単体テスト、WidgetリリースAARの組み立ても成功。React Native、Swift、Kotlin間でWidgetスキーマv12を確認した。
- `expo-doctor@1.20.0`: 20/20項目が成功。`pnpm install --frozen-lockfile`も成功。`pnpm audit --prod --audit-level=high`はhigh 0件で、許容したビルドツール由来のmoderate 2件は`docs/security/mobile-build-tooling-audit-20260713.md`に記録した。
- Browser Check 2: オフラインで作成したNoteが再接続後にHTTP 200で同期され、別ブラウザへ表示され、正常に削除できた。無料プランのアップグレードUI、AdminのHttpOnly/SameSite=Laxセッション復元、サーバー側ログアウト、認証後にコンソールエラーがないことを確認した。最終的なAdmin/公開Webのログイン処理もRedisを有効にしたBackendの構成ルート（composition root）に対して成功し、コンソールに出たのは初回匿名アクセス時の想定どおりの401だけだった。
- レビューサイクル: KV復帰後にLogic/SecurityとArchitecture/Testabilityのクロスレビューを繰り返し、KV書き込み制限、background error観測、APM span、lease残骸、再試行時刻契約を修正した。最終差分は両レビュアーがLGTMとした。

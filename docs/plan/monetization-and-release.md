# Actiko マネタイズ & リリース戦略

> 2026-03-24 壁打ちセッションで策定。これが現行の正式な戦略ドキュメント。

## コンセプト

**コアバリュー: 「任意の活動を、最小手数で定量記録して、すぐ見返せる」**

- 「入力の面倒さを排除したい」「活動量をパッと見返せるようにしたい」の2点がアプリの存在理由
- 習慣系アプリが続かなかったユーザー（開発者自身）が1年以上使い続けている実績がある
- 既存の競合（Toggl, Streaks, Forest, Loop Habit Tracker等）はこの3点セットを満たしていない
  - 時間しか記録できない / Yes/Noのみ / カテゴリ固定 / UIが重い

## マネタイズ方針: 「記録チャネル課金」

引き算のUXが本質のアプリで、機能制限による課金は矛盾する。
代わりに **「同じシンプルな体験に触れられる場所（チャネル）を増やす」** ことで課金価値を作る。

### Free / Pro 境界

| 記録チャネル | Free | Pro |
|-------------|------|-----|
| アプリ内（6モード全部） | 無制限 | 無制限 |
| ウィジェット | 1個 | 無制限 |
| API（外部連携） | なし | 解放 |
| 音声コマンド（AI） | なし | 解放 |
| Apple Watch / Wear OS | なし | 解放 |

**設計原則:**
- アプリ内のコア体験は一切制限しない。Freeでも「最高のアプリ」と思える状態を維持
- 課金動機は「もっと色んな場所で使いたい」。アプリを気に入った人ほど自然に感じる欲求
- パブリックリポジトリ前提。課金チェックはサーバーサイド寄せ（クライアント側はUI案内のみ）

### 将来的なPro拡張候補（出力チャネル）

実装優先度は低いが、Proの厚みを増す候補:
- 週次ダイジェスト通知
- Apple Health書き出し
- シェア可能な統計カード（Spotify Wrapped的な年間レビュー）

## ロードマップ

### Phase 0: ストア公開（Free版、課金なし）

- アプリアイコン作成
- ストアスクリーンショット・説明文（ターゲット: 「習慣アプリが続かなかった人」に絞る）
- App Store / Google Play 公開

### Phase 1: Pro課金基盤 + 記録チャネル拡張

**最初にやること: entitlement設計（直列・最優先）**
- plan情報をSQLite/Dexieにどう持つか
- ネイティブ（Swift/Kotlin）からplanをどう参照するか
- サーバーの `/user/me` にplanを含める（設計ドキュメント既存）
- RevenueCat/PolarのWebhookでuser_subscriptionレコードを更新

**以下は並列実行可能:**

1. ウィジェット追加モード（iOS + Android）
   - カウンター / チェック / バイナリの3モード
   - 手動入力・テンキーはウィジェットUI制約と合わないため対象外
   - Free: 1個まで / Pro: 無制限
2. 音声認識記録（OS標準音声アシスタント連携）
   - バックエンドAI基盤は実装済み（`/users/ai/activity-logs/from-speech`）
   - アプリを起動せずにOS音声認識 → テキスト → HTTP POST → バックエンドAI解析 → リモートDB書き込み
   - **iOS**: App Intents で `RecordBySpeechIntent` を追加。Siri / ショートカットアプリから呼べる（既存 `TimerAppIntents.swift` と同パターン）
   - **Android**: App Actions (`actions.xml`) でGoogle Assistantから呼べるカスタムアクションを定義。fulfillmentはActivity/Serviceで受けてHTTP POST
   - **認証方式**: voice-onlyスコープのAPI Keyを発行し、OSのセキュアストレージに保存（iOS: App Group Keychain / Android: EncryptedSharedPreferences）。ネイティブ拡張はそこから読み取ってHTTPヘッダに付与。既存API Key基盤を流用
   - **前提作業**: 現状のAPI Keyにscopeの概念がない（`api_key`テーブルにscopeカラムなし）。scopeカラム追加（マイグレーション + domain/repository/usecase修正）を直列で先に実施する
3. APIキー Pro ゲート
   - 既存premiumMiddlewareで制御（実装済みに近い）
4. RevenueCat（Mobile） + Polar（Web）

   Webの決済にはPolarを採用（Merchant of Record）。Polarが法的な売主となり、税務処理（消費税/VAT/Sales Tax）を代行する。個人開発で国際販売の税務を自前対応する必要がなくなる。手数料は4% + 40¢（Stripeより約1%高いが、税務処理込みなので実質的には安い）。

   **実装済み（バックエンド）:**
   - Webhook受信・署名検証（RevenueCat Bearer / Stripe HMAC）
   - Webhook → `user_subscription` テーブル upsert（INITIAL_PURCHASE / RENEWAL / CANCELLATION / EXPIRATION 等）
   - `premiumMiddleware` によるPro判定
   - `GET /subscription` エンドポイント
   - entitlement判定ロジック（`canUseApiKey`, `canUseVoiceRecord`, `canUseWatch`, `maxWidgetCount`）
   - フロント/モバイルの `usePlan` フック（キャッシュ読み取り）

   **実装が必要（Claude Code作業）:**
   - Stripe Webhook → Polar Webhookへの差し替え（Standard Webhooks準拠、署名検証方式が異なる）
   - Polar Checkout連携（PolarホストのCheckout UIへのリダイレクト。Stripe Checkout Session作成より軽量）
   - Web側の購入UI（アップグレードモーダル / 価格表示 / Polar Checkoutへの遷移）
   - Mobile側のRevenueCat SDK統合（`react-native-purchases`）→ アプリ内課金フロー
   - Mobile側の購入UI（アップグレード画面 / 復元ボタン）
   - Webhookエンドポイントの本番URL設定後のE2Eテスト（現状はモック呼び出しのみ）

   **ユーザー作業（アカウント・ダッシュボード操作）:**
   - Polar: アカウント作成 → サブスク商品（Product）・価格作成 → Webhook URL設定 → APIキー取得 → サンドボックスで課金フローテスト
   - RevenueCat: プロジェクト作成 → App Store Connect / Google Play Console と接続 → サブスク商品（Product）登録 → Webhook URL設定 → APIキー取得
   - App Store Connect: サブスクリプショングループ・商品作成 → サンドボックステスターアカウント作成
   - Google Play Console: 定期購入商品作成 → テスト用ライセンスアカウント登録
   - 環境変数の登録: Polar APIキー・Webhook Secret、`REVENUECAT_WEBHOOK_AUTH_KEY`、RevenueCat APIキー

**想定工期: 約5日（Claude Code全力並列稼働）**

### Phase 2: Apple Watch対応（大型アップデート・Pro目玉機能）

- `@bacons/apple-targets` でwatchOSターゲット追加（WidgetKitと同パターン）
- Swift/SwiftUI でWatch UI（Activity一覧 + タップ記録 + タイマー）
- App Group + SQLite経由でデータ共有（既存パターン流用）
- Siri音声入力との統合
- Wear OS調査を並行（Kotlin + Jetpack Compose、別APK配布の可能性）

### 常時: UX改善

- 開発者自身がヘビーユーザーであることが最大の強み
- docs/plan/ux-research.md の課題を継続的に対応

## 優先順位の根拠

D（自分の道具）> A（収益）> B（ユーザー数）= C（実績）

- 自分が快適に使えることが最優先
- Claude MAX代（~$200/月）の回収が収益目標
- Phase 0 → 1 の順序にこだわらず、予測が外れたらPro後回しでリリース前倒し可能

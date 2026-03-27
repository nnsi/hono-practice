# Actiko モバイルアプリ ストアリリース チェックリスト

> 対象: `apps/mobile` (Expo SDK 54, Managed Workflow)
> Bundle ID: `$BUNDLE_ID` (iOS / Android 共通、`.env` で設定)

---

## 1. EAS (Expo Application Services) セットアップ

- [x] `eas-cli` をグローバルインストール: `npm install -g eas-cli`
- [x] Expo アカウントでログイン: `eas login`
- [x] プロジェクトを Expo に紐付け: `eas init` （`apps/mobile/` 内で実行）
- [x] `eas.json` を作成（下記テンプレート参照）

### eas.json テンプレート

preview（stg）/ production で環境変数とチャンネルを分離する。
OTA Update は channel に紐付くため、preview ビルドに production の OTA が配信されることはない。

**環境変数は `eas.json` に書かない**（Public リポジトリのため）。`eas env:create` でEASサーバー側に登録する。

```json
{
  "cli": { "version": ">= 15.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "ios": { "simulator": false }
    },
    "production": {
      "autoIncrement": true,
      "channel": "production"
    }
  }
}
```

### 環境変数一覧

| 変数名 | 用途 | 参照箇所 |
|--------|------|----------|
| `EXPO_PUBLIC_API_URL` | バックエンド API のベース URL | `apiClient.ts` — 未設定で本番ビルド時はクラッシュ |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth のクライアント ID | `LoginForm.tsx`, `SettingsPage.tsx` |
| `EXPO_PUBLIC_CONTACT_EMAIL` | 法的情報画面の問い合わせ先メール | `LegalModal.tsx` |

> **Note:** 開発時（`__DEV__`）は `EXPO_PUBLIC_API_URL` 未設定でも Metro bundler のホスト IP から `http://<host>:3456` を自動解決する。

### 環境変数の登録方法

`eas env:create` で環境（preview / production）ごとに登録する。
`EXPO_PUBLIC_` プレフィックスにより Metro が自動インライン化するため、`app.config.ts` の `extra` + `expo-constants` パターンは不要。

```bash
cd apps/mobile

# preview（初期検証では本番 API に接続して実データで確認する）
eas env:create --environment preview --name EXPO_PUBLIC_API_URL --value "https://<API_DOMAIN>" --visibility plaintext
eas env:create --environment preview --name EXPO_PUBLIC_GOOGLE_CLIENT_ID --value "<値>" --visibility plaintext
eas env:create --environment preview --name EXPO_PUBLIC_CONTACT_EMAIL --value "<値>" --visibility plaintext
```

---

## 2. 実機テスト（ストア掲載不要・アイコン不要）

> アイコンやストア情報がなくても、ここまでで実機インストールできる。
> ストアに出す前にまず動作確認したい場合はここまでやればOK。

### EAS Internal Distribution（最速）

アイコン・スプラッシュが未設定でもビルド可能。QR / URL で直接インストール。

- [x] Preview ビルド実行
  ```bash
  cd apps/mobile
  eas build --platform all --profile preview
  ```
- [x] ビルド完了後、Expo ダッシュボードの QR コード / URL を端末で開いてインストール
- [x] iOS の場合: 端末の UDID を事前に EAS に登録する必要あり
  - `eas device:create` でデバイス登録（初回のみ）
- [x] Android の場合: APK が直接生成されるのでそのままインストール

### 実機テスト確認項目

- [チェックリスト](./mobile-checklist.md)参照

---

## 3. Apple Developer / Google Play アカウント準備

> 審査に時間がかかることがあるため、実機テストと並行して早めに進める。

- [x] Apple Developer Program に登録（年額 $99）
  - https://developer.apple.com/programs/
- [ ] Google Play Console に登録（一回 $25）
  - https://play.google.com/console/
- [x] Apple: App ID (`$BUNDLE_ID`) を Apple Developer Portal で登録
- [ ] Google: Google Play Console でアプリを新規作成
- [x] Apple Developer アカウントを EAS に接続: `eas credentials`

---

## 4. アプリアセット作成

- [x] **アプリアイコン** (1024x1024 PNG, 透過なし) → `assets/icon.png`
- [x] **Adaptive Icon 前景** (1024x1024 PNG, 透過あり) → `assets/adaptive-icon.png`
- [x] **スプラッシュスクリーン** (1284x2778 推奨) → `assets/splash.png`
- [x] **Favicon** (48x48 PNG) → `assets/favicon.png`（既存ファイルが空なので差し替え）
- [x] `app.json` のアイコン・スプラッシュ設定を更新:

```jsonc
{
  "expo": {
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      }
    }
  }
}
```

---

## 5. 本番環境設定

- [ ] EAS の production 環境変数を登録:
  ```bash
  cd apps/mobile
  eas env:create --environment production --name EXPO_PUBLIC_API_URL --value "<値>" --visibility plaintext
  eas env:create --environment production --name EXPO_PUBLIC_GOOGLE_CLIENT_ID --value "<値>" --visibility plaintext
  eas env:create --environment production --name EXPO_PUBLIC_CONTACT_EMAIL --value "<値>" --visibility plaintext
  ```
- [ ] バックエンド CORS に本番ドメインを追加

---

## 6. コード署名

### iOS

- [ ] EAS が自動管理する場合: `eas credentials` で Provisioning Profile & Certificate を生成
- [ ] 手動管理の場合:
  - [ ] Distribution Certificate を作成
  - [ ] App Store 用 Provisioning Profile を作成
  - [ ] Push Notification 用の Key を作成（将来通知を使う場合）

### Android

- [ ] Upload Keystore を生成（EAS が自動生成 or 手動）
  - 手動: `keytool -genkeypair -v -storetype JKS -keyalg RSA -keysize 2048 -validity 10000 -storepass <pass> -keypass <pass> -alias actiko -keystore actiko.jks`
- [ ] Google Play App Signing を有効化（推奨: Google に署名鍵を管理させる）

---

## 7. ストア掲載情報の準備

### 共通

- [x] アプリ名: `Actiko`
- [ ] 短い説明文（80文字以内）
- [ ] 詳細な説明文（4000文字以内）
- [x] プライバシーポリシー URL を用意（**必須**）
- [ ] カテゴリ: プライマリ `Lifestyle` / セカンダリ `Health & Fitness`
- [ ] 対象年齢の設定

### 説明文たたき台

#### App Store サブタイトル（30文字以内）

> 最速で活動量を記録するアプリ

#### App Store プロモーションテキスト（170文字以内・審査なしで随時変更可）

> 習慣アプリが続かなかった人へ。筋トレ・読書・ゲーム戦績──どんな活動も1タップで記録。6種類の入力UIが、あなたの活動に最適な記録体験を提供します。

#### 説明文（App Store / Google Play 共通）

```
■ Actikoとは？

「記録がめんどくさい」──それが習慣アプリを辞めた理由なら、Actikoが答えです。

活動ごとに最適な入力UIを選べるから、どんな記録も最小手数で完了。
1年以上、開発者自身が毎日使い続けている実績があります。

■ 6つの記録モード

🔢 カウンター ── タップで+1。腕立て・スクワットに
⏱ タイマー ── ストップウォッチで時間を計測。読書・作業に
✅ チェック ── やった/やってないのワンタップ記録
🆚 バイナリ ── 勝ち/負けなど二択を瞬時に記録
🔟 テンキー ── 数値を直接入力。スコアや摂取量に
📝 マニュアル ── 自由入力のフォールバック

■ こんな人に

・習慣アプリを3つ以上試して続かなかった
・筋トレ回数、ゲーム戦績、読書量など種類がバラバラ
・記録は1秒でも早く終わらせたい

■ 主な機能

・ホーム画面のグリッドから即記録
・日別・月別の統計ビュー
・借金システムのゴール管理（サボった分を後日返済できる柔軟な目標設定）
・オフライン完全対応・複数端末で自動同期
・CSVエクスポート/インポート
・タスク管理

すべての記録機能は無料で制限なく使えます。
```

#### Google Play 短い説明（80文字以内）

> 6つの入力UIで、どんな活動も最速で記録。習慣アプリが続かなかった人のためのアプリ。

#### 英語版（国際公開する場合）

**Subtitle (App Store):** Record any activity, instantly
**Short Description (Google Play):** 6 input modes for any activity. Built for people who quit every habit tracker.

```
■ What is Actiko?

"Recording is too tedious" — if that's why you quit your habit app, Actiko is the answer.

Choose the optimal input UI for each activity, and finish recording in minimal taps.
Built and used daily by its developer for over a year.

■ 6 Recording Modes

🔢 Counter — Tap to increment. For push-ups, squats
⏱ Timer — Built-in stopwatch. For reading, work sessions
✅ Check — One-tap done/not done
🆚 Binary — Win/Lose in one tap
🔟 Numpad — Direct number entry. For scores, intake
📝 Manual — Free-form fallback

■ Built for you if...

• You've tried 3+ habit apps and none stuck
• You track diverse activities — workouts, gaming stats, reading, coding
• You want recording to take less than a second

■ Key Features

• Grid dashboard for instant recording
• Daily & monthly statistics
• Flexible goal system with "debt" — miss a day, make it up later
• Fully offline with automatic multi-device sync
• CSV import/export
• Task management

All recording features are free with no limits.
```

#### キーワード候補（App Store Search Ads最適化）

習慣,活動記録,ルーティン,筋トレ記録,タイマー,ストップウォッチ,目標管理

### iOS (App Store Connect)

- [ ] スクリーンショット（各デバイスサイズ）
  - [ ] 6.7" (iPhone 15 Pro Max): 1290x2796 — **Xcodeシミュレータで撮影OK**（`Cmd + S`で保存）
  - [ ] 6.1" (iPhone 15 Pro): 1179x2556 — 実機で撮影
  - [ ] iPad Pro 12.9": 2048x2732（`supportsTablet: true` なので必要）
  - 6.7インチを提出すれば6.5インチ（旧Max）にも自動適用される
- [ ] サポート URL
- [ ] App Review 用のデモアカウント情報

### Android (Google Play Console)

- [ ] フィーチャーグラフィック (1024x500)
- [ ] スクリーンショット（最低2枚、最大8枚）
  - 推奨: 1080x1920 以上。iOS実機スクショの流用で可
- [ ] コンテンツレーティング質問票を回答
- [ ] データセーフティフォーム（収集データの申告）
- [ ] ターゲットオーディエンス設定

### スクリーンショット撮影計画（8枚・優先順）

| # | 画面 | キャプション案 | ポイント |
|---|---|---|---|
| 1 | ホーム画面（アクティビティグリッド） | ホーム画面から1タップで記録開始 | 活動5〜6個。絵文字アイコンで視覚訴求 |
| 2 | カウンターモード記録中 | タップするだけ。筋トレ回数を最速記録 | 大きな+ボタンとカウント表示 |
| 3 | タイマーモード記録中 | ストップウォッチで作業時間を計測 | 読書や勉強のイメージ |
| 4 | 月間統計（Statsタブ） | 月間の活動量をひと目で把握 | バーチャートと借金ヒートマップ |
| 5 | ゴール画面（借金ヒートマップ） | サボった日は後日返済。柔軟なゴール管理 | GitHub風ヒートマップ。競合差別化 |
| 6 | バイナリモード | 勝ち/負けをワンタップで記録 | 他アプリにない用途 |
| 7 | Daily（日別ログ） | 1日の活動をタイムラインで振り返り | ログが複数並んだ状態 |
| 8 | チェックモード | やった？やってない？シンプルな習慣記録も | 従来の習慣アプリユーザーへの安心感 |

**撮影時の注意:**
- デモ用データを入れてから撮る（空画面は論外）
- 活動名は共感しやすいもの: 「腕立て伏せ」「読書」「ランニング」「ゲーム戦績」「瞑想」「コーディング」
- 絵文字をカラフルに: 💪📚🏃‍♂️🎮🧘‍♂️💻
- 実機とシミュレータで同じデモデータを使う

---

## 8. ベータ配布（TestFlight / Google テストトラック）

### iOS: TestFlight

Apple 公式のベータ配布。ストア掲載情報・スクリーンショット不要。

- [ ] Production プロファイルでビルド: `eas build --platform ios --profile production`
- [ ] App Store Connect にアップロード:
  ```bash
  eas submit -p ios --apple-id "$APPLE_ID" --asc-app-id "$ASC_APP_ID"
  ```
  > `appleId` / `ascAppId` は Public リポジトリのため `eas.json` に書かない。CLI フラグで渡す。
- [ ] **内部テスター**（審査なし・即配布）
  - [ ] App Store Connect → TestFlight → 内部テスターにチームメンバーを追加（最大100人）
  - [ ] テスターに自動で招待メールが届く → TestFlight アプリからインストール
- [ ] **外部テスター**（初回のみ簡易審査、通常1日以内）
  - [ ] テストグループを作成し、メールアドレス or 公開リンクで招待（最大10,000人）
  - [ ] 審査提出 → 承認後に配布開始
- [ ] ビルドの有効期限: 90日（期限切れ前に再ビルド）

### Android: テストトラック

Google Play Console の段階的テスト配布。ストア掲載前でも配布可能。

- [ ] Production プロファイルでビルド: `eas build --platform android --profile production`
- [ ] Google Play Console にアップロード:
  ```bash
  eas submit -p android --service-account-key-path ./google-service-account.json
  ```
- [ ] **内部テスト**（審査なし・即配布）
  - [ ] Google Play Console → テスト → 内部テストでテスターリストにメールアドレス追加（最大100人）
  - [ ] 招待リンクを共有 → Play ストアからインストール
- [ ] **クローズドテスト**（審査あり・人数制限なし）
- [ ] **オープンテスト**（審査あり・誰でも参加可能）

---

## 9. Production ビルド & ストア申請

- [ ] iOS: `eas build --platform ios --profile production`
- [ ] Android: `eas build --platform android --profile production`
- [ ] ビルド成果物を実機で最終確認（セクション2のテスト確認項目を再実施）

### iOS

- [ ] submit（TestFlight で既にアップロード済みならスキップ）:
  ```bash
  eas submit -p ios --apple-id "$APPLE_ID" --asc-app-id "$ASC_APP_ID"
  ```
- [ ] App Store Connect でビルドを確認
- [ ] 審査に提出
- [ ] 審査フィードバック対応（リジェクト時）
- [ ] 承認後リリース（手動 or 自動）

### Android

- [ ] Google Play Console でサービスアカウントキーを作成
  - → `google-service-account.json` をプロジェクトに配置（`.gitignore` に追加）
- [ ] submit:
  ```bash
  eas submit -p android --service-account-key-path ./google-service-account.json
  ```
- [ ] 内部テストトラックで配布 → 最終確認
- [ ] クローズドテスト → オープンテスト（任意）
- [ ] 製品版トラックに昇格
- [ ] 審査完了後リリース

---

## 10. リリース後

- [ ] OTA アップデート設定: `eas update` のワークフロー構築
- [ ] Sentry 等のクラッシュレポート導入（任意）
- [ ] バージョン管理ルールの策定（semver）
- [ ] CI/CD パイプライン構築（GitHub Actions + EAS Build）
  - ADR: [workflow_dispatch による手動デプロイ](/docs/adr/20260316_mobile_cicd_workflow_dispatch.md)

---

## 参考リンク

- [Expo: Build & Submit](https://docs.expo.dev/build/introduction/)
- [EAS Submit](https://docs.expo.dev/submit/introduction/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Launch Checklist](https://developer.android.com/distribute/best-practices/launch/launch-checklist)

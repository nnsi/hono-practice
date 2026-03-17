# Actiko モバイルアプリ ストアリリース チェックリスト

> 対象: `apps/mobile` (Expo SDK 54, Managed Workflow)
> Bundle ID: `com.actiko.app` (iOS / Android 共通)

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
eas env:create --environment preview --name EXPO_PUBLIC_API_URL --value "https://api.actiko.app" --visibility plaintext
eas env:create --environment preview --name EXPO_PUBLIC_GOOGLE_CLIENT_ID --value "<値>" --visibility plaintext
eas env:create --environment preview --name EXPO_PUBLIC_CONTACT_EMAIL --value "<値>" --visibility plaintext
```

---

## 2. 実機テスト（ストア掲載不要・アイコン不要）

> アイコンやストア情報がなくても、ここまでで実機インストールできる。
> ストアに出す前にまず動作確認したい場合はここまでやればOK。

### EAS Internal Distribution（最速）

アイコン・スプラッシュが未設定でもビルド可能。QR / URL で直接インストール。

- [ ] Preview ビルド実行
  ```bash
  cd apps/mobile
  eas build --platform all --profile preview
  ```
- [ ] ビルド完了後、Expo ダッシュボードの QR コード / URL を端末で開いてインストール
- [ ] iOS の場合: 端末の UDID を事前に EAS に登録する必要あり
  - `eas device:create` でデバイス登録（初回のみ）
- [ ] Android の場合: APK が直接生成されるのでそのままインストール

### 実機テスト確認項目

- [ ] ログイン / ユーザー作成
- [ ] アクティビティ記録（メイン機能）
- [ ] データ同期（サーバーとの通信）
- [ ] オフライン動作 → オンライン復帰時の同期
- [ ] 各タブ画面の表示・遷移
- [ ] 設定画面

---

## 3. Apple Developer / Google Play アカウント準備

> 審査に時間がかかることがあるため、実機テストと並行して早めに進める。

- [ ] Apple Developer Program に登録（年額 $99）
  - https://developer.apple.com/programs/
- [ ] Google Play Console に登録（一回 $25）
  - https://play.google.com/console/
- [ ] Apple: App ID (`com.actiko.app`) を Apple Developer Portal で登録
- [ ] Google: Google Play Console でアプリを新規作成
- [ ] Apple Developer アカウントを EAS に接続: `eas credentials`

---

## 4. アプリアセット作成

- [ ] **アプリアイコン** (1024x1024 PNG, 透過なし) → `assets/icon.png`
- [ ] **Adaptive Icon 前景** (1024x1024 PNG, 透過あり) → `assets/adaptive-icon.png`
- [ ] **スプラッシュスクリーン** (1284x2778 推奨) → `assets/splash.png`
- [ ] **Favicon** (48x48 PNG) → `assets/favicon.png`（既存ファイルが空なので差し替え）
- [ ] `app.json` のアイコン・スプラッシュ設定を更新:

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
  eas env:create --environment production --name EXPO_PUBLIC_API_URL --value "https://api.actiko.app" --visibility plaintext
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

- [ ] アプリ名: `Actiko`
- [ ] 短い説明文（80文字以内）
- [ ] 詳細な説明文（4000文字以内）
- [ ] プライバシーポリシー URL を用意（**必須**）
- [ ] カテゴリ: `Productivity` or `Health & Fitness`
- [ ] 対象年齢の設定

### iOS (App Store Connect)

- [ ] スクリーンショット（各デバイスサイズ）
  - [ ] 6.7" (iPhone 15 Pro Max): 1290x2796
  - [ ] 6.5" (iPhone 14 Plus): 1284x2778
  - [ ] 5.5" (iPhone 8 Plus): 1242x2208（任意）
  - [ ] iPad Pro 12.9": 2048x2732（`supportsTablet: true` なので必要）
- [ ] App Store 用プロモーションテキスト（170文字）
- [ ] サポート URL
- [ ] App Review 用のデモアカウント情報

### Android (Google Play Console)

- [ ] フィーチャーグラフィック (1024x500)
- [ ] スクリーンショット（最低2枚、最大8枚）
  - 推奨: 1080x1920 以上
- [ ] コンテンツレーティング質問票を回答
- [ ] データセーフティフォーム（収集データの申告）
- [ ] ターゲットオーディエンス設定

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

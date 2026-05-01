# Mobile (Actiko) ビルド・確認ガイド

## 前提条件

| ツール | バージョン | 確認コマンド |
|--------|-----------|-------------|
| Node.js | 24.x | `node --version` |
| pnpm | 10.x | `pnpm --version` |
| Xcode | **26+ (iOS ローカルビルド時)** | `xcodebuild -version` |
| CocoaPods | 1.16+ | `pod --version` |
| JDK | 17 (Temurin) | `java -version`（mise.tomlで管理） |
| Android SDK | 36 | `ls ~/Library/Android/sdk/platforms/` |
| iOS Simulator runtime | iOS 18.6+ | `xcrun simctl list runtimes` |
| EAS CLI | 18+ | `eas --version` |
| Maestro CLI | 2.5+ | `maestro --version` |

> **iOS ローカルビルドの注意**: Expo SDK 55 の `expo-modules-core` が Swift 6.2+ 構文を使うため **Xcode 26 必須**。Xcode 16.x は build エラー（`unknown attribute 'MainActor'` 等）。Xcode 16.x のままなら **EAS Build を使うこと**。Android ローカルビルドは Xcode 不要なので影響なし。

## 初回セットアップ

### 1. 依存インストール

```bash
pnpm install
```

### 2. 環境変数

`apps/mobile/.env` を作成（既存値が EAS server に登録済みなので CLI で取得可能）:

```bash
# EAS にログイン
eas login

# .env ファイル作成（値は EAS dashboard or eas env:list から取得）
cat > apps/mobile/.env <<EOF
BUNDLE_ID=com.actiko.app
EAS_PROJECT_ID=<ExpoダッシュボードのProject ID>
EAS_OWNER=<Expoアカウント名>
EOF
```

> **注意**: `app.config.ts` は `process.env.X` から値を読む。Expo CLI（`expo start` / `expo run:*`）は `.env` を自動読込するが、**EAS CLI は `.env` を自動読込しない**。`apps/mobile/package.json` の `pnpm eas <args>` ラッパー（`dotenv-cli` 経由）を使うこと。グローバルの `eas` を直接叩く場合は事前に `set -a; source .env; set +a` で env をエクスポート。

### 3. iOS Simulator runtime のインストール（iOS ローカルビルド時のみ）

Xcode 26 をインストール後、SDK と一致する simulator runtime も必要:

```bash
xcodebuild -downloadPlatform iOS
```

`xcrun simctl list runtimes` で iOS の runtime（18.6+）が表示されればOK。

### 4. Android 環境変数（mise.toml で自動設定）

`apps/mobile/mise.toml` に JDK 17 と ANDROID_HOME が定義済み。
mise が有効なシェルであれば `cd apps/mobile` で自動適用される。

手動で設定する場合は `~/.zprofile` に以下を追加:

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export ANDROID_SDK_ROOT=$ANDROID_HOME
export PATH=$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH
```

## ビルド方法

### ローカル開発（Expo Go / Dev Client）

```bash
cd apps/mobile

# Metro bundler 起動
pnpm dev

# iOS シミュレータで実行（prebuild + ビルド + 起動）
pnpm ios

# Android エミュレータで実行
pnpm android
```

> `pnpm ios` / `pnpm android` は初回に `ios/` / `android/` ディレクトリを生成する（gitignore済み）。

### Android エミュレータの起動

```bash
# AVD 一覧
$ANDROID_HOME/emulator/emulator -list-avds

# エミュレータ起動（バックグラウンド）
$ANDROID_HOME/emulator/emulator -avd Pixel_7_API_35 &
```

### EAS Build（リモートビルド）

EAS Build はクラウド上でネイティブビルドを実行する。20-30分かかるため慎重に。

```bash
cd apps/mobile

# iOS 実機用 Dev Client（内部配布）
pnpm eas build --profile development --platform ios

# iOS シミュレータ用 Dev Client
pnpm eas build --profile development:simulator --platform ios

# Android 実機用 Dev Client
pnpm eas build --profile development --platform android

# Preview ビルド（QA / テスト用）
pnpm eas build --profile preview --platform ios
pnpm eas build --profile preview --platform android

# Production ビルド（App Store / Play Store）
pnpm eas build --profile production --platform ios
pnpm eas build --profile production --platform android
```

### OTA Update（JS バンドルのみ更新）

ネイティブコードの変更がない場合、EAS Update で即時配信できる。

```bash
cd apps/mobile
pnpm eas update --channel preview --message "変更内容の説明"
```

## ビルドプロファイル一覧

| プロファイル | 用途 | 配布 | チャネル |
|-------------|------|------|---------|
| `development` | 開発用 Dev Client（実機） | internal | development |
| `development:simulator` | 開発用 Dev Client（iOSシミュレータ） | internal | development |
| `preview` | QA / ステージング確認 | internal | preview |
| `production` | ストア提出用 | - | production |

## 確認方法

### iOS シミュレータ

1. `pnpm ios` で自動起動、またはEASでシミュレータ用ビルドをインストール:
   ```bash
   # ビルド完了後、.app をダウンロードしてインストール
   pnpm eas build:run --platform ios
   ```

### iOS 実機

1. `pnpm eas build --profile development --platform ios` でビルド
2. ビルド完了後、Expo ダッシュボードまたは QR コードからインストール
3. Apple Developer アカウントでデバイス登録が必要（EAS が自動で管理）

### Android エミュレータ

1. エミュレータを起動: `$ANDROID_HOME/emulator/emulator -avd Pixel_7_API_35 &`
2. `pnpm android` で自動ビルド＆インストール、または:
   ```bash
   pnpm eas build:run --platform android
   ```

### Android 実機

1. USBデバッグを有効化
2. `adb devices` でデバイス接続を確認
3. `pnpm android` または EAS ビルドの .apk をインストール

## Claude Code から動作確認する（Maestro / Expo MCP）

Claude Code から iOS Simulator / Android emulator を直接操作できる MCP サーバを 2 つ導入する。

### Maestro MCP（E2E テスト実行・既存 `.maestro/*.yaml` の操作）

```bash
# Maestro CLI インストール（PATH に ~/.maestro/bin を追加）
curl -Ls "https://get.maestro.mobile.dev" | bash

# Claude Code に登録（フルパスで指定する。PATH 解決に失敗するため）
claude mcp add maestro -s user -- /Users/$USER/.maestro/bin/maestro mcp
```

`claude mcp list` で `maestro: ✓ Connected` を確認。

### Expo MCP（screenshot / tap / testID で要素検索）

Expo 公式リモート MCP。SDK 54+ 必須（このプロジェクトは SDK 55 でOK）。

```bash
claude mcp add --transport http expo-mcp -s user https://mcp.expo.dev/mcp
```

初回は要認証。Claude Code セッション内で `/mcp` を実行 → `expo-mcp` を選択 → ブラウザで Expo アカウント認証。

### 使い分け

| 用途 | ツール |
|------|-------|
| ad-hoc 動作確認（screenshot / tap / 要素検索） | **Expo MCP** |
| E2E テスト実行・新規 flow 作成 | **Maestro MCP** |
| 既存 `apps/mobile/.maestro/smoke.yaml` 実行 | **Maestro MCP** |

> Expo MCP は app.config.ts の `extra.eas.projectId` に紐づくので、`apps/mobile/.env` の `EAS_PROJECT_ID` が正しく load されている必要がある。

## トラブルシューティング

### `expo run:ios` が失敗する

```bash
# prebuild をクリーンしてやり直す
npx expo prebuild --clean --platform ios
pnpm ios
```

### `unknown attribute 'MainActor'` 等 Swift コンパイルエラー（24+ errors）

`expo-modules-core` の Swift 6.2+ 構文を Xcode 16.x が解釈できない。**Xcode 26 にアップグレード必須**（Expo SDK 55 の正式要件）。Xcode 16.x のままなら iOS は EAS Build 経由でしかビルドできない。

### `iOS X.Y is not installed` / `Unable to find a destination matching`

Xcode の SDK バージョンに対応する iOS Simulator runtime が未インストール。

```bash
xcodebuild -downloadPlatform iOS
```

8GB 程度のダウンロードで 30-60 分かかる。完了後 `xcrun simctl create` で対応バージョンの simulator を作成。

### `No code signing certificates are available`

`apps/mobile/.env` に `APPLE_TEAM_ID` を設定する。Xcode に Apple ID が登録済みなら以下で確認:

```bash
defaults read com.apple.dt.Xcode IDEProvisioningTeams | grep teamID
```

### `expo run:android` が失敗する

```bash
# JAVA_HOME を確認
java -version  # 17.x であること

# prebuild をクリーン
npx expo prebuild --clean --platform android
pnpm android
```

### EAS Build のステータス確認

```bash
# ビルド一覧（CLIの出力が止まって見えても、EAS側で実行中の可能性あり）
pnpm eas build:list --limit 5
```

### Metro キャッシュクリア

```bash
npx expo start --clear
```

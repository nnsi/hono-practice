# Mobile (Actiko) ビルド・確認ガイド

## 前提条件

| ツール | バージョン | 確認コマンド |
|--------|-----------|-------------|
| Node.js | 24.x | `node --version` |
| pnpm | 10.x | `pnpm --version` |
| Xcode | 16.4+ | `xcodebuild -version` |
| CocoaPods | 1.16+ | `pod --version` |
| JDK | 17 (Temurin) | `java -version`（mise.tomlで管理） |
| Android SDK | 35 | `ls ~/Library/Android/sdk/platforms/` |
| EAS CLI | 18+ | `eas --version` |

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

> **注意**: `app.config.ts` は `process.env.X` から値を読む。Expo CLI（`expo start` / `expo run:*`）は `.env` を自動読込するが、**EAS CLI（`eas build` 等）は自動読込しない**。EAS CLI 実行時は事前に `set -a; source .env; set +a` で env をエクスポートすること。

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
eas build --profile development --platform ios

# iOS シミュレータ用 Dev Client
eas build --profile development:simulator --platform ios

# Android 実機用 Dev Client
eas build --profile development --platform android

# Preview ビルド（QA / テスト用）
eas build --profile preview --platform ios
eas build --profile preview --platform android

# Production ビルド（App Store / Play Store）
eas build --profile production --platform ios
eas build --profile production --platform android
```

### OTA Update（JS バンドルのみ更新）

ネイティブコードの変更がない場合、EAS Update で即時配信できる。

```bash
cd apps/mobile
eas update --channel preview --message "変更内容の説明"
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
   eas build:run --platform ios
   ```

### iOS 実機

1. `eas build --profile development --platform ios` でビルド
2. ビルド完了後、Expo ダッシュボードまたは QR コードからインストール
3. Apple Developer アカウントでデバイス登録が必要（EAS が自動で管理）

### Android エミュレータ

1. エミュレータを起動: `$ANDROID_HOME/emulator/emulator -avd Pixel_7_API_35 &`
2. `pnpm android` で自動ビルド＆インストール、または:
   ```bash
   eas build:run --platform android
   ```

### Android 実機

1. USBデバッグを有効化
2. `adb devices` でデバイス接続を確認
3. `pnpm android` または EAS ビルドの .apk をインストール

## トラブルシューティング

### `expo run:ios` が失敗する

```bash
# prebuild をクリーンしてやり直す
npx expo prebuild --clean --platform ios
pnpm ios
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
eas build:list --limit 5
```

### Metro キャッシュクリア

```bash
npx expo start --clear
```

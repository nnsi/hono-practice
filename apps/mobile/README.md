# Actiko Mobile

React Native (Expo SDK 55) モバイルアプリ。

## 開発環境セットアップ

### 前提

- Node.js / pnpm
- EAS CLI (`npm install -g eas-cli`)
- 実機（iOS / Android）

### Development Build の作成

初回、またはネイティブコード変更時にEAS Buildで dev build を作成する:

```bash
# iOS（TestFlight経由で実機にインストール）
npx eas-cli build --profile development --platform ios

# Android（QRコードで実機にインストール）
npx eas-cli build --profile development --platform android
```

### 日常の開発フロー

1. Metro dev server を起動:

```bash
cd apps/mobile
npx expo start
```

2. 実機のdev clientアプリからQRスキャンで接続
3. HMRが効くので、コード変更は即座に反映される

### ビルドが必要なタイミング

| 変更内容 | 必要なアクション |
|---------|---------------|
| JS/TSコードのみ | 不要（HMRで即反映） |
| ネイティブモジュール追加・更新 | `eas-cli build --profile development` |
| ウィジェット (`modules/timer-widget`) 変更 | `eas-cli build --profile development` |
| 本番リリース | `eas-cli build --profile production` |

### Web での確認

ブラウザでレイアウトを素早く確認したい場合:

```bash
cd apps/mobile
npx expo start --web
```

## Maestro E2E

`apps/mobile/.maestro/smoke.yaml` に Android / iOS 共通の smoke flow を置いている。対象は `ログイン -> Tasks タブ移動 -> タスク作成`。

### 前提

- Maestro CLI をインストール済み
- Android は emulator、iOS は Simulator を起動済み
- Mac の local smoke は backend を別ターミナルで起動

```bash
pnpm mobile:e2e:server
```

### Windows で Android smoke

Windows は `expo run:android` のネイティブ build が path length 制限に当たりやすいので、`e2e-local-android` で作った APK を emulator に入れて smoke を回す。

1. Android APK を EAS で作る

```bash
cd apps/mobile
eas build --platform android --profile e2e-local-android
```

2. smoke runner を実行する

```bash
pnpm mobile:e2e:android:windows -- -ApkPath C:\path\to\actiko-e2e.apk
```

この runner は local backend 起動、emulator 起動、`adb install`、Maestro 実行までまとめて行う。`maestro` が PATH に無い場合は `-MaestroPath C:\path\to\maestro.bat` を付ける。既に backend を自分で起動している場合だけ `-SkipBackend` を使う。

### Mac で iOS smoke

1. Simulator へアプリを入れる

```bash
pnpm --filter actiko-mobile ios
pnpm --filter actiko-mobile start:dev-client
```

2. Maestro を実行する

```bash
cd apps/mobile
maestro test .maestro/smoke.yaml
```

### EAS Workflows

- Android: `apps/mobile/.eas/workflows/e2e-test-android.yml`
- iOS: `apps/mobile/.eas/workflows/e2e-test-ios.yml`

`e2e-test` profile は emulator / simulator 用 artifact を作り、EAS の `preview` environment を使う。`EXPO_PUBLIC_API_URL` はその environment に登録した到達可能な backend を指す必要がある。`BUNDLE_ID` を preview environment で上書きした場合、workflow 側の `MAESTRO_APP_ID` も同じ値を参照する。未指定時の既定値は `com.actiko.app`。

## 環境変数

- ローカル: `.env` から読み込み（git管理外）
- EAS Build: `eas env:create` でサーバー側に登録
- アプリ内参照: `process.env.EXPO_PUBLIC_*`

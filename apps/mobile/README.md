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
- iOS は Simulator を起動済み（Android は emulator）
- iOS の `pnpm mobile:e2e:build` には **Fastlane** が必要（`brew install fastlane`）
- E2E は dev サーバー（backend 3456 / Metro 8081）と並行稼働できるようポート分離:
  - E2E backend: `localhost:3536`（PGlite + seed user）
  - dev-client から回す場合の E2E Metro: `localhost:8082`（`pnpm mobile:e2e:metro`）

### Mac で iOS smoke（推奨: build 済み artifact + 1 コマンド）

build 済みの `e2e-local-ios` artifact があれば dev launcher / dev menu の介入無しで `launchApp: clearState` がそのまま使えるため、運用がもっとも楽。

```bash
pnpm mobile:e2e:build   # 初回 / API 変更時のみ。eas build --local で apps/mobile/build/ios-sim/Actiko.app を生成
pnpm mobile:e2e         # backend 起動 → install → maestro test smoke.yaml まで一気通貫
```

`pnpm mobile:e2e` がやること:
1. PGlite backend を `localhost:3536` で BG 起動
2. booted simulator を検出（事前に Simulator.app で起動しておく）
3. `apps/mobile/build/ios-sim/Actiko.app` を install（uninstall → install で state クリア）
4. `maestro test apps/mobile/.maestro/smoke.yaml`
5. 終了時に backend を kill

flow を絞りたい場合は `FLOW=path/to/flow.yaml pnpm mobile:e2e` で上書き可。

### Mac で Android smoke

iOS と同じ pattern で Android emulator 向けの 1 コマンド E2E が回せる。

```bash
pnpm mobile:e2e:build:android   # 初回 / API 変更時のみ。eas build --local で apps/mobile/build/android/actiko-e2e.apk 生成
pnpm mobile:e2e:android         # backend 起動 → APK install → maestro test smoke.yaml
```

事前に emulator を boot しておく:

```bash
~/Library/Android/sdk/emulator/emulator -avd Pixel_7_API_35 -no-snapshot-save -no-audio &
```

`pnpm mobile:e2e:android` がやること:
1. PGlite backend を `localhost:3536` で BG 起動（`10.0.2.2:3536` から emulator が到達）
2. `adb devices` から booted emulator を検出
3. `apps/mobile/build/android/actiko-e2e.apk` を install（uninstall → install で state クリア）
4. `maestro --device <id> test apps/mobile/.maestro/smoke.yaml`
5. 終了時に backend を kill

flow 切り替えは `FLOW=apps/mobile/.maestro/note.yaml pnpm mobile:e2e:android`。

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

### Mac で iOS smoke（dev-client から回す場合）

flow を作りこみ中で hot reload したいとき向け。`pnpm mobile:e2e` のように `clearState` は使えない（dev launcher へ戻るため）。

1. Simulator へアプリを入れる（初回のみ）

```bash
pnpm --filter actiko-mobile ios
```

2. E2E backend / Metro を起動（別ターミナル）

```bash
pnpm mobile:e2e:server
pnpm mobile:e2e:metro    # Metro 8082
```

3. dev launcher で `localhost:8082` を選んで E2E bundle をロードしてから Maestro を実行

```bash
cd apps/mobile
maestro test .maestro/flows/login.yaml   # smoke.yaml は clearState の都合で dev-client では完走しない
```

### EAS Workflows

- Android: `apps/mobile/.eas/workflows/e2e-test-android.yml`
- iOS: `apps/mobile/.eas/workflows/e2e-test-ios.yml`

`e2e-test` profile は emulator / simulator 用 artifact を作り、EAS の `preview` environment を使う。`EXPO_PUBLIC_API_URL` はその environment に登録した到達可能な backend を指す必要がある。`BUNDLE_ID` を preview environment で上書きした場合、workflow 側の `MAESTRO_APP_ID` も同じ値を参照する。未指定時の既定値は `com.actiko.app`。

## 環境変数

- ローカル: `.env` から読み込み（git管理外）
- EAS Build: `eas env:create` でサーバー側に登録
- アプリ内参照: `process.env.EXPO_PUBLIC_*`

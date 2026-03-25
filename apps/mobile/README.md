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

## 環境変数

- ローカル: `.env` から読み込み（git管理外）
- EAS Build: `eas env:create` でサーバー側に登録
- アプリ内参照: `process.env.EXPO_PUBLIC_*`

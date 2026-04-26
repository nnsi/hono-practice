---
name: eas-build
description: モバイルアプリのネイティブビルド（EAS Build）を実行する。ネイティブコード変更時に使用。
user_invocable: true
---

# EAS Build（ネイティブビルド）

ネイティブコード（Swift/Kotlin）の変更を含むビルドを EAS Build で実行する。OTA Updateでは配信できない変更（ウィジェット、ネイティブモジュール等）に使う。

## 手順

### 1. 引数からオプションを取得

`/eas-build [profile] [platform]`

- profile: `preview`（デフォルト）/ `development`
- platform: `ios` / `android` / `all`（デフォルト）

### 2. app.config.ts 用の環境変数をセット

```bash
cd apps/mobile && set -a && source .env && set +a
```

これで `BUNDLE_ID`, `EAS_PROJECT_ID`, `EAS_OWNER` がセットされる。**この手順を飛ばすと `eas` コマンドが `EAS project not configured` エラーで失敗する。**

### 3. ビルド実行

```bash
cd apps/mobile && npx eas-cli build --profile <profile> --platform <platform>
```

- iOS/Android 両方の場合は `--platform all` を使う
- ビルドはバックグラウンドで実行する（長時間かかるため）

### 4. 結果報告

ビルド完了後、各プラットフォームの Build ID と EAS Dashboard URL を報告する。

## プロファイル別の違い

| | preview | development |
|---|---|---|
| 用途 | 内部配布テスト | HMR付き実機開発 |
| distribution | internal | internal |
| developmentClient | なし | true |
| 使い方 | QR/リンクでインストール→単体で動作 | QR/リンクでインストール→`npx expo start`に接続 |

## 注意事項

- ビルドは EAS のリモートサーバーで実行される（ローカルビルドではない）
- 作業ディレクトリは必ずプロジェクトルートから `apps/mobile` に移動してから実行する
- **EAS環境変数はプロファイルごとに独立** — `preview` に登録済みでも `development` には未登録の場合がある。ビルドが bundle ID 不一致で失敗したら `eas env:list --environment <env>` で確認する

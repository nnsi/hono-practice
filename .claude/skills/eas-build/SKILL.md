---
name: eas-build
description: モバイルアプリのネイティブビルド（EAS Build）をpreviewプロファイルで実行する。ネイティブコード変更時に使用。
user_invocable: true
---

# EAS Build（ネイティブビルド）

ネイティブコード（Swift/Kotlin）の変更を含むビルドを EAS Build で実行する。OTA Updateでは配信できない変更（ウィジェット、ネイティブモジュール等）に使う。

## 手順

### 1. 引数からオプションを取得

`/eas-build [platform]` で `ios` / `android` / `all`（デフォルト）を指定可能。

### 2. app.config.ts 用の環境変数をセット

```bash
cd apps/mobile && set -a && source .env && set +a
```

これで `BUNDLE_ID`, `EAS_PROJECT_ID`, `EAS_OWNER` がセットされる。**この手順を飛ばすと `eas` コマンドが `EAS project not configured` エラーで失敗する。**

### 3. ビルド実行

```bash
cd apps/mobile && npx eas-cli build --profile preview --platform <platform> --non-interactive
```

- iOS/Android 両方の場合は `--platform all` を使う
- `--non-interactive` を付けてプロンプトをスキップする
- ビルドはバックグラウンドで実行する（長時間かかるため）

### 4. 結果報告

ビルド完了後、各プラットフォームの Build ID と EAS Dashboard URL を報告する。

## 注意事項

- `preview` プロファイルは `distribution: internal`（内部配布用）
- ビルドは EAS のリモートサーバーで実行される（ローカルビルドではない）
- 作業ディレクトリは必ずプロジェクトルートから `apps/mobile` に移動してから実行する

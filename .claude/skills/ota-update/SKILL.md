---
name: ota-update
description: モバイルアプリのOTA Update（EAS Update）をpreviewチャンネルに配信する。
user_invocable: true
---

# OTA Update（EAS Update）

モバイルアプリのJSバンドルをOTA配信する。ネイティブ変更は含められない。

詳細手順: `docs/ops/mobile-ota.md`

## 手順

### 1. 引数からメッセージを取得

ユーザーが `/ota-update <message>` で指定したメッセージを使う。指定がなければ直近のgit diffから変更内容を要約して生成する。

### 2. app.config.ts 用の環境変数をセット

`eas` コマンドが `app.config.ts` を読み込むために必要。

```bash
cd D:/workspace/hono-practice/apps/mobile && set -a && source .env && set +a
```

これで `BUNDLE_ID`, `EAS_PROJECT_ID`, `EAS_OWNER` がセットされる。**この手順を飛ばすと `eas` コマンドが `EAS project not configured` エラーで失敗する。**

### 3. EXPO_PUBLIC 環境変数を取得

```bash
cd D:/workspace/hono-practice/apps/mobile && npx eas-cli env:list --environment preview
```

出力から `EXPO_PUBLIC_*` の変数と値を取得する。

### 4. Android配信

```bash
cd D:/workspace/hono-practice/apps/mobile && \
EXPO_PUBLIC_API_URL=<値> \
EXPO_PUBLIC_CONTACT_EMAIL=<値> \
EXPO_PUBLIC_GOOGLE_CLIENT_ID=<値> \
EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID=<値> \
EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS=<値> \
npx eas-cli update --channel preview --platform android --message "<メッセージ>" --clear-cache
```

**`--clear-cache` は毎回付ける**（環境変数なしバンドルのキャッシュ事故を防ぐため）。

### 5. iOS配信

```bash
cd D:/workspace/hono-practice/apps/mobile && \
EXPO_PUBLIC_API_URL=<値> \
EXPO_PUBLIC_CONTACT_EMAIL=<値> \
EXPO_PUBLIC_GOOGLE_CLIENT_ID=<値> \
EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID=<値> \
EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS=<値> \
npx eas-cli update --channel preview --platform ios --message "<メッセージ>"
```

iOS側は `--clear-cache` 不要（Android配信でキャッシュは再構築済み）。

### 6. 結果報告

Android/iOSそれぞれの Update ID と EAS Dashboard URL を報告する。

## 注意事項

- `--platform all` は使わない（webバンドル生成でfavicon.pngのMIMEエラーが発生するため）
- 環境変数を付け忘れると `EXPO_PUBLIC_API_URL is not set` でアプリが壊れる。**必ず手順2で取得してから配信する**
- 作業ディレクトリは必ず `D:/workspace/hono-practice/apps/mobile` を絶対パスで指定する

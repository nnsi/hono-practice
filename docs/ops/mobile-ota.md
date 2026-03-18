# モバイル OTA Update 運用手順

## 前提

- EAS Update は JS バンドルのみを差し替える（ネイティブ変更は含められない）
- `EXPO_PUBLIC_*` 環境変数は Metro のバンドル時に JS に焼き込まれる
- EAS クラウドビルドでは `eas env` に登録された変数が自動注入されるが、**ローカルからの `eas update` では自動注入されない**

## ローカルから OTA Update を配信する手順

### 1. 環境変数を取得

```bash
cd apps/mobile
npx eas-cli env:list --environment preview
```

preview 以外の環境に配信する場合は `--environment` を変更する。

### 2. 環境変数を付けて配信

手順1で取得した変数を環境変数としてセットして実行する。

```bash
EXPO_PUBLIC_API_URL=<取得した値> \
EXPO_PUBLIC_CONTACT_EMAIL=<取得した値> \
EXPO_PUBLIC_GOOGLE_CLIENT_ID=<取得した値> \
npx eas-cli update --channel preview --platform android,ios --message "変更内容" --clear-cache
```

**`--clear-cache` は初回または環境変数を変更した場合に必須。** Metro キャッシュに環境変数なしのバンドルが残っていると、変数が焼き込まれないまま配信される。

### 3. 反映確認

`_layout.tsx` で `fetchUpdateAsync()` 成功後に `reloadAsync()` を呼んでいるため、**1回のコールドスタートで反映される**。起動中に update のダウンロード → 自動リロードが走る。

ただし `reloadAsync()` が入る前のビルドでは2回のコールドスタートが必要になる（1回目でダウンロード、2回目で適用）。

## `--platform android,ios` を指定する理由

`eas update` はデフォルトで全プラットフォーム（web/ios/android）のバンドルをエクスポートする。`assets/favicon.png` が空ファイルの場合、web 向けエクスポートで Jimp の MIME 判定エラーが出る。`--platform android,ios` で web を除外して回避する。

## トラブルシューティング

### OTA が反映されない

`adb logcat -s ReactNativeJS:*` で `[updates]` ログを確認する。

| ログ | 意味 | 対処 |
|------|------|------|
| `isEnabled: false` | expo-updates が無効 | app.json の plugins に `expo-updates` があるか確認、ネイティブリビルド |
| `reason: "updatePreviouslyFailed"` | 過去の update 適用でクラッシュしたため、以降の同一 update をスキップ | アプリのデータを消去（設定 → アプリ → Actiko → ストレージ → データを消去）してから再試行。新しい update ID で配信すれば別 update として扱われる |
| `reason: "noUpdateAvailableOnServer"` | サーバーに新しい update がない | 正常。最新の update が適用済み |
| `EXPO_PUBLIC_API_URL is not set` | 環境変数なしでバンドルされた | 環境変数を付けて `--clear-cache` で再配信 |

### `updatePreviouslyFailed` のメカニズム

expo-updates は update 適用後にクラッシュを検知すると、その update ID を「失敗」としてマークする。以降の `checkForUpdateAsync()` は同じ update に対して `isAvailable: false` を返す。別の update ID で配信するか、アプリのデータを消去するとフラグがリセットされる。

### iOS のログ確認

Mac から Console.app または `idevicesyslog` でログを確認する。

```bash
# libimobiledevice をインストール済みの場合
idevicesyslog | grep -i "updates\|ReactNativeJS"
```

Mac がない場合は Expo の開発クライアント（`npx expo start --dev-client`）経由でターミナルにログが出力される。

### adb の接続（Android）

1. 実機の開発者オプション → USB デバッグを有効化
2. USB 接続後、接続モードを「ファイル転送（MTP）」に変更
3. `adb devices` でデバイスが認識されることを確認

```bash
# Android SDK の adb を直接使う場合
"$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe" devices
```

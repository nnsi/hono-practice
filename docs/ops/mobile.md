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
| iOS Simulator runtime | iOS 26.x（Xcode 26 同梱 SDK と一致） | `xcrun simctl list runtimes` |
| EAS CLI | 18+ | `eas --version` |
| Maestro CLI | 2.5+ | `maestro --version` |
| Fastlane | 2.230+ | `fastlane --version` |

> **iOS ローカルビルドの注意**: Expo SDK 55 の `expo-modules-core` が Swift 6.2+ 構文を使うため **Xcode 26 必須**。Xcode 16.x は build エラー（`unknown attribute 'MainActor'` 等）。Xcode 16.x のままなら **EAS Build を使うこと**。Android ローカルビルドは Xcode 不要なので影響なし。

> **Fastlane**: `pnpm mobile:e2e:build`（`eas build --local`）の iOS ビルドに必要。`brew install fastlane` で導入。

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
APPLE_TEAM_ID=<Apple Developer Team ID（iOS ローカルビルド時のみ必須）>
EOF
```

> **注意**: `app.config.ts` は `process.env.X` から値を読む。Expo CLI（`expo start` / `expo run:*`）は `.env` を自動読込するが、**EAS CLI は `.env` を自動読込しない**。`apps/mobile/package.json` の `pnpm eas <args>` ラッパー（`dotenv-cli` 経由）を使うこと。グローバルの `eas` を直接叩く場合は事前に `set -a; source .env; set +a` で env をエクスポート。

### 3. iOS Simulator runtime のインストール（iOS ローカルビルド時のみ）

Xcode 26 をインストール後、SDK と一致する iOS runtime のダウンロードが必要（iOS 26.x、**約 8.5GB、30〜60 分かかる** ので Wi-Fi が安定した時間帯にやる）:

```bash
# Xcode のライセンス同意（初回のみ。インタラクティブ）
sudo xcodebuild -license accept

# iOS platform / simulator runtime ダウンロード
xcodebuild -downloadPlatform iOS

# 完了後、対応バージョンの simulator を作成
xcrun simctl create "iPhone 16 Pro 26" "iPhone 16 Pro" "com.apple.CoreSimulator.SimRuntime.iOS-26-4"
```

`xcrun simctl list runtimes` で iOS 26.4 が表示され、`xcrun simctl list devices` で作成した simulator が見えればOK。`pnpm ios --device <UDID>` で指定して起動する。

### 4. Android emulator (AVD) の作成

Android E2E を回す場合、`Pixel 7 API 35` AVD が必要:

```bash
# Android Studio の Device Manager GUI から作る、もしくは CLI:
sdkmanager "system-images;android-35;google_apis;arm64-v8a"
avdmanager create avd -n Pixel_7_API_35 -k "system-images;android-35;google_apis;arm64-v8a"

# boot 確認
$ANDROID_HOME/emulator/emulator -avd Pixel_7_API_35 -no-snapshot-save -no-audio &
$ANDROID_HOME/platform-tools/adb devices   # `emulator-5554 device` が出れば OK
```

### 5. Android 環境変数（mise.toml で自動設定）

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

## Claude Code から動作確認する

### Maestro CLI（E2E テスト実行・既存 `.maestro/*.yaml` の操作）

ターミナルから直接 `maestro test` を叩く。フロー間で XCUITest driver が再接続して挙動が乱れる経路を踏まないため、E2E は常にこのルートで回す。

```bash
# Maestro CLI インストール（PATH に ~/.maestro/bin を追加）
curl -Ls "https://get.maestro.mobile.dev" | bash

# 実行例
cd apps/mobile
maestro test .maestro/smoke.yaml
maestro test .maestro/task.yaml
```

driver が刺さったときは `pkill -9 -f maestro-driver` でリセットして再実行する。

#### testID を追加したら必ず再ビルド

testID は JS バンドルに埋め込まれるため、`.tsx` で testID を追加・変更した後は **必ず `pnpm mobile:e2e:build` を回して `apps/mobile/build/ios-sim/Actiko.app` を作り直す**。古い artifact のまま `maestro test` を回すと、新しい testID を含む assertion が永遠に通らない（5/2 の `tasks.edit.dialog` 事故）。

判別ポイント:
- `assertVisible: id: <testID>` は落ちるが `assertVisible: text: <表示中の文字列>` は通る → testID が現在の build に入っていない
- `stat -f "%Sm" apps/mobile/build/ios-sim/Actiko.app/Actiko` の更新時刻が、testID 追加 commit より古ければ再ビルド必要

ネイティブモジュールの追加・変更ではなく **JS の testID 追加だけ** でも再ビルドが必要なのは、`e2e-local-ios` profile がリリースビルドで JS バンドルを `.app` に焼き込むため（dev-client の HMR は使えない）。

#### flow 設計上の落とし穴（5/2 検証で踏んだもの）

- **各 suite は自己完結にする**: `apps/mobile/.maestro/flows/login.yaml` 冒頭で `launchApp` を呼んでアプリをコールド起動 → root 画面に戻してから assertion を始める。これが無いと、前 suite が note 詳細などで終わった直後に `tabs.tasks` が見えず login.yaml で落ちる。`launchApp` は state を消さない（refresh token は keychain に残る）ので 2 回目以降は login フォームが skip される。
- **データを生む flow は per-run unique なタグを使う**: `task.yaml` は `apps/mobile/.maestro/scripts/gen-run-tag.js` で `output.RUN_TAG = "r" + Date.now()` を吐き、以降の作成・assertion を `${output.RUN_TAG}` で参照する。ハードコード（`r2000` 等）は `extendedWaitUntil notVisible: <タグ>` が前回残骸にヒットして再実行で死ぬ。
- **再実行で active リストが伸びる前提で `tasks.add` を取る**: 単一の `swipe` だと leftover タスクが増えたとき FAB がタブバー裏に隠れて落ちるので、`scrollUntilVisible: id: tasks.add` で確実にスクロールしてから tap する。
- **モーダルが絡む assertion は `extendedWaitUntil` を使う**: iOS 26.4 の RN `Modal` はアニメーションが終わるまで testID が XCUITest hierarchy に出ないことがあり、`assertVisible`（短いポーリング）だと取りこぼす。`extendedWaitUntil: visible: id: ... timeout: 10000` で 10 秒程度の余裕を持たせる。

### Expo MCP（screenshot / tap / testID で要素検索）

Expo 公式リモート MCP。SDK 54+ 必須（このプロジェクトは SDK 55 でOK）。ad-hoc な画面確認・要素検索のみ用途。

```bash
claude mcp add --transport http expo-mcp -s user https://mcp.expo.dev/mcp
```

初回は要認証。Claude Code セッション内で `/mcp` を実行 → `expo-mcp` を選択 → ブラウザで Expo アカウント認証。

### 使い分け

| 用途 | ツール |
|------|-------|
| ad-hoc 動作確認（screenshot / tap / 要素検索） | **Expo MCP** |
| E2E テスト実行・新規 flow 作成 | **Maestro CLI（ターミナル）** |
| 既存 `apps/mobile/.maestro/*.yaml` 実行 | **Maestro CLI（ターミナル）** |

### 0 から E2E を回すまでの最短手順（Mac / iOS）

事前条件: 上の「初回セットアップ」が一通り済んでいて、`brew install fastlane` 済み、`maestro --version` が 2.5+。

```bash
# 1) Simulator を boot（既に起動済みならスキップ）
open -a Simulator    # GUI から Pixel 系・iPhone 16 Pro 26 等を boot
# CLI で UDID 指定する場合: xcrun simctl boot <UDID>

# 2) e2e 用 iOS sim ビルドを作る（5〜10 分。testID 追加 / API 変更があるたび必須）
pnpm mobile:e2e:build

# 3) suite を回す。デフォルトは smoke。FLOW で別 suite に切替可
pnpm mobile:e2e
FLOW=apps/mobile/.maestro/task.yaml pnpm mobile:e2e
FLOW=apps/mobile/.maestro/note.yaml pnpm mobile:e2e
```

`pnpm mobile:e2e` 内部の流れ: backend を `:3536` で起動 → app を uninstall → install → `maestro test <FLOW>` → 終了時に backend kill。app は毎回 install しなおすので keychain がリセットされ、login.yaml がフォーム入力経路を通る。

### 0 から E2E を回すまでの最短手順（Mac / Android）

事前条件: 上の「Android emulator (AVD) の作成」を済ませてあること。

```bash
# 1) emulator を boot（30 秒〜1 分で BOOT_COMPLETED）
$ANDROID_HOME/emulator/emulator -avd Pixel_7_API_35 -no-snapshot-save -no-audio &
$ANDROID_HOME/platform-tools/adb devices   # `emulator-5554 device` を確認

# 2) APK を作る（5〜10 分）
pnpm mobile:e2e:build:android

# 3) 回す
pnpm mobile:e2e:android
FLOW=apps/mobile/.maestro/task.yaml pnpm mobile:e2e:android
```

### 既知の落とし穴: Android で Maestro driver が auto-install されない

新しい emulator（特に API 35 等の新しめの SDK）に対して `maestro test` 初回実行時、Maestro の Android driver が自動インストールされず以下のエラーで止まることがある:

```
Not able to reach the gRPC server while processing deviceInfo command
Caused by: java.io.IOException: Command failed (tcp:7001): closed
```

このとき `adb shell pm list packages | grep maestro` が空ならインストールされていない。手動で入れる:

```bash
cd /tmp
unzip -o $HOME/.maestro/lib/maestro-client.jar maestro-app.apk maestro-server.apk
$ANDROID_HOME/platform-tools/adb install -r maestro-app.apk
$ANDROID_HOME/platform-tools/adb install -r maestro-server.apk
```

その後 `maestro test` を再実行すれば driver がそのまま使われる。emulator を wipe-data した場合は再度同じ手順が必要。

> **なぜ自動で入らないのか**: Maestro 2.5.1 の Android driver auto-install ロジックが特定の SDK / emulator 構成で no-op になることがある（5/2 確認）。issue として残るが workaround は安定して効く。

### 動かないときのチェックリスト

詰まったらまずこの順で確認:

1. **`assertVisible: id: <testID>` だけ落ちる / `text:` は通る**
   → testID が build artifact に入ってない。`stat -f "%Sm" apps/mobile/build/ios-sim/Actiko.app/Actiko` の更新時刻を testID 追加 commit と比較し、古ければ `pnpm mobile:e2e:build` をやり直す。Android なら `apps/mobile/build/android/actiko-e2e.apk` の時刻と `pnpm mobile:e2e:build:android`。
2. **login.yaml の `assertVisible: id: tabs.tasks` で落ちる**
   → 直前の suite が note 詳細などで終わってアプリが root に居ない。`flows/login.yaml` 冒頭の `launchApp` で root に戻すように既に書いてあるが、その行が消えていないか確認。
3. **`tasks.add` が見つからない / FAB がタブバー裏にいる**
   → 過去の test run で active リストが伸びている。`scrollUntilVisible: id: tasks.add` を使っているか確認。task.yaml は対応済み。
4. **`extendedWaitUntil` が timeout する（モーダル系）**
   → iOS 26.4 + RN `Modal` のアニメーション中は testID が hierarchy に出ないことがある。timeout を 10 秒に伸ばすか、`waitForAnimationToEnd` を挟む。
5. **driver が刺さってる感じがする / Android で `tcp:7001 closed`**
   → iOS は `pkill -9 -f maestro-driver` でリセット。Android で tcp:7001 closed エラーは driver app 未インストール → 上記「既知の落とし穴」セクションの手順で `adb install` する。
6. **dev-client 経由で tap が変なところに行く**
   → Floating Tools button（dev menu の歯車）が `common.menu` 等の上に乗っている。dev menu から Tools button を OFF。reload で復活するので毎回チェック。安定運用に入ったら build artifact 経由（`pnpm mobile:e2e`）に切り替える。

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

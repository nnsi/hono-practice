# Expo SDK 56 preview.12 → SDK 55 ロールバック

## ステータス

決定（2026-05-19）

## コンテキスト

2026-05-17 に Expo SDK 55 → 56 preview.12 へアップグレードした（commit `6dab64ab`、`20260517_expo_sdk56_hermes_v1_workaround.md`）。SDK 56 の Hermes V1 + 新 Swift/C++ JSI interop による `EXC_BAD_ACCESS` を E2E モードバイパスで回避する前提だった。

2026-05-19、iPhone 16 Pro Max (A18 Pro) / iOS 26.3.1 / EAS preview build で複数の native crash が報告された。実機接続で 5 件の `.ips` を採取し、`atos` で部分シンボル化した結果、3 つの異なる crash signature を確認：

| Pattern | top frame | 推定経路 |
|---|---|---|
| A | `HermesRuntimeImpl::createArray` | Array 返す Swift sync function（`getLocales()` 等） |
| B | `HermesRuntimeImpl::createStringFromUtf8` | String 返す Swift sync function（`Paths.appleSharedContainers.uri` 等） |
| C | `HermesRuntimeImpl::hasNativeState` | JSI Object の native state アクセス |

SDK 56 期間中に試した workaround（いずれも OTA 配信、すべて不十分）：

1. `packages/sync-engine/core/serverTime.ts` で `response.headers.get('date')` を try/catch → Stats 画面の crash は消えた
2. `apps/mobile/app/_layout.tsx` で `getLocales()` 削除、`deviceLang = "ja"` 固定 → Pattern A は消えたが Pattern B/C が残った

### 業界の状況（2026-05-19 時点）

- `expo/expo#44606`（open）: iPhone 17 Pro Max / iOS 26.3.1 で SDK 55 + 56 canary とも `hermesvm` crash。**hermesvm UUID が SDK 55 と SDK 56 canary で同一** → pre-built Hermes binary が iOS 26 の PAC (Pointer Authentication Codes) enforcement に対応していない
- `expo/expo#44356`（closed）: SDK 55 + Hermes V1/V2 ともに 100% crash 報告、`Reanimated/Worklets が Hermes 必須` のため JSC build fail で「No workaround exists」
- `facebook/hermes#1966`（closed, by Hermes contributor）: 「これは Hermes バグではなく React Native の thread-safety 違反」と判定。`facebook/react-native#55390` で fix（既に SDK 56 / RN 0.85.3 の `performVoidMethodInvocation` に取り込み済みを node_modules で確認）
- `software-mansion/react-native-reanimated#8547`（open）: JSC ビルドが Reanimated で失敗、未解決

### 検討した選択肢

1. **個別 sync function を 1つずつ avoid（getLocales 削除を続けた延長）**
   - Pattern B / C は経路が広く、Expo modules の Swift sync function 全般で発火し得る。イタチごっこ
2. **iOS だけ `jsEngine: "jsc"` 切替**
   - `react-native-reanimated@4.3.1` + `react-native-worklets@0.8.3` が Hermes 必須でビルド失敗の可能性が高い（#8547、#44356 が裏付け）
3. **New Architecture 無効化**
   - Reanimated 4.x が NA 必須でブロック（#44356 の reporter が podspec assert で確認済み）
4. **SDK 55 ロールバック**
   - 業界レポート（#44606）では SDK 55 でも crash 報告ありだが、**私たちの構成（同一端末・同一コードベース）では SDK 56 アップグレード前は crash していなかった**という実体験データを優先
   - SDK 56 preview.12 固有の `expo-modules-jsi` 新パッケージのバグ（#45876 系の lifetime 問題）が主因であれば、SDK 55 では回避できる
5. **SDK 56 stable リリースを待つ**
   - 上流の fix（Hermes binary recompile / iOS 26.4+ の PAC 緩和）も含めて待つが、preview build の停滞を許容できない

## 決定事項

**選択肢 4: SDK 55 へロールバックする。**

### 根拠

- Pattern A/B/C すべてが Hermes 内部関数で発火しており、**JS 層の try/catch では native segfault を捕捉できない**ことを実証
- 実体験データ（「SDK 55 までは同じ端末で crash していなかった」）が、業界の crash レポートより私たちのアプリの構成にとって信頼度が高い
- JSC 切替は Reanimated 4.x の Hermes 依存で不可、New Architecture 無効化も Reanimated の NA 依存で不可
- SDK 56 stable または iOS 26.4+ / 上流 Hermes binary recompile を待つ方針に切り替え

### 実施内容

1. `git revert 6dab64ab`（commit `666db8b2`）で SDK 56 アップグレードを完全に巻き戻す
2. `pnpm install` で SDK 55 依存関係に戻す（expo@55, react-native@0.83.2, react@19.2.0）
3. EAS Update preview channel iOS の 2 件の SDK 56 用 workaround OTA を、5 日前の安定 group（`36651068-d72e-48b7-8511-9b20718b69ce`、EditActivityDialog fix）に `eas update:republish` でロールバック
4. `runtimeVersion: 1.0.0` は維持（preview build のテスター範囲が限定的で、version bump は不要と判断）
5. EAS Build iOS preview を再実行して TestFlight に配布

## 影響

- SDK 56 で取り込んだ変更（expo-router 56 codemod、splash 設定の expo-splash-screen plugin 化、`ios.deploymentTarget: "16.4"`、`@bacons/apple-targets` patch、`scripts/mobile-e2e-run-all.sh`）も巻き戻る
- 削除された ADR `20260517_expo_sdk56_hermes_v1_workaround.md` と日記 `20260517.md` は revert で消える（git 履歴には残る）
- E2E Maestro の 28 suites 順次実行スクリプトも巻き戻るが、SDK 55 では E2E モードバイパスが不要になるため影響は軽微
- preview channel に残る 2 件の SDK 56 用 workaround OTA は履歴に残るが、最新は 5 日前の安定版に置き換わったため新規 install には影響しない

## フォローアップ

- **SDK 56 stable リリース時**: 再アップグレードを検討。preview.13 以降で `expo-modules-jsi` の lifetime バグ（#45876 系）が fix されているか確認
- **iOS 26.4 リリース時**: Apple の PAC enforcement 緩和の有無を検証
- **facebook/react-native#55390** がマージされたら、SDK 56 への取り込み状況を確認
- **`expo-modules-jsi` の null guard 修正** が SDK 56 preview に入るか追跡（#45876 で提案されたパターン）
- **次回 SDK アップグレード時のリスク管理**: preview release を 1〜2 日 own dogfood してから OTA 配信ユーザーへ展開する手順を確立する

## 関連

- 業界 issue: [`expo/expo#44606`](https://github.com/expo/expo/issues/44606), [`#44356`](https://github.com/expo/expo/issues/44356), [`#45876`](https://github.com/expo/expo/issues/45876)
- 上流 PR: [`facebook/react-native#55390`](https://github.com/facebook/react-native/pull/55390)（既に SDK 56 RN 0.85.3 取り込み済み）
- Hermes: [`facebook/hermes#1966`](https://github.com/facebook/hermes/issues/1966)
- Reanimated: [`software-mansion/react-native-reanimated#8547`](https://github.com/software-mansion/react-native-reanimated/issues/8547)
- Revert commit: `666db8b2`
- EAS Update republish group: `1e0a3437-d71c-461f-9434-d0e823aa19c0`

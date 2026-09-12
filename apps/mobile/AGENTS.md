# Mobile

native 変更・課金の承認条件はルート AGENTS.md に従う。

- 秘密値を `eas.json` に書かない。ビルド環境の変数は EAS の対象 environment で管理する。`EXPO_PUBLIC_*` はバンドルに含まれる公開値。
- Page、Dialog、主要ボタン、入力に `apps/mobile/src/testing/testIds.ts` の `mobileTestIds` を付ける。動的リストは既存の ID suffix factory を使い、装飾 View には付けない。
- コンポーネント分割は責務と読みやすさで判断する。行数だけを理由に変更範囲を広げない。

## E2E

- 手順は `apps/mobile/README.md` と `docs/ops/mobile.md`。変更した flow は連続実行してデータ作成や状態が衝突しないか確認する。
- 実行対象が最新 JS を含むことを確認する。バンドル内蔵 artifact で JS / testID 変更を検証するなら artifact 更新が必要。dev client / OTA と native 再 build の要否を混同しない。
- Maestro はターミナルから実行する。dev client の floating Tools button が tap を遮っていないか確認する。
- local build と emulator / Maestro 検証は直列にする。driver 停止は自分のセッションのプロセスを特定して行う。

## native・実行時の注意

- WidgetKit / App Intents / AlarmManager などは対象 SDK の API 制約を確認する。共有 SQLite schema と JS / Swift / Kotlin の互換性を保つ。
- React Navigation の context 必須 hook は custom navigator / tab bar に対応する Provider があるか確認する。型チェックだけで判断しない。
- テーマは `actiko-v2-theme` に永続化し `useTheme` / `applyColorScheme` で復元する。`Updates.reloadAsync()` 後の Appearance override に依存しない。
- nativewind の本番 theme 更新は既存 patch に依存する。変更前に `docs/adr/20260402_nativewind_color_scheme_patch.md` を読む。

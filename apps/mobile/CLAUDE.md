# mobile 開発ルール

## 環境変数

- **`eas.json` に環境変数の値を書かない**（gitに秘密情報を載せないため）
- 環境変数は `eas env:create` でEASサーバー側に登録する
- アプリ内では `process.env.EXPO_PUBLIC_*` で参照（`EXPO_PUBLIC_` プレフィックスによりMetroが自動インライン化）
- `app.config.ts` の `extra` + `expo-constants` パターンは不要

## ネイティブ実装
- **ネイティブAPI（WidgetKit, App Intents, AlarmManager等）を使う前に公式ドキュメントで制約を確認する**。EAS Buildは1回20-30分かかるため、コンパイルエラーでの失敗コストが大きい（Siri phrasesのString制約知らず→ビルド1回無駄、AlarmManager vs Chronometer→ビルド3回無駄の教訓）

## テーマ（ダークモード）
- nativewind の `setColorScheme()` は内部的に `Appearance.setColorScheme()` を呼ぶだけで、`colorSchemeObservable` を本番では更新しない。**pnpm patch (`react-native-css-interop`) で本番でも observable を同期更新するよう修正済み**（→ `docs/adr/20260402_nativewind_color_scheme_patch.md`）
- `Appearance.setColorScheme()` の結果は `Updates.reloadAsync()` で消える（JSだけでなくネイティブ側のAppearance overrideもリセットされる）
- テーマ設定は AsyncStorage (`actiko-v2-theme`) に永続化し、起動時に `useTheme` フックで読み込み→ `applyColorScheme` で適用

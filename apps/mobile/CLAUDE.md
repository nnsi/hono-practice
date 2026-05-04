# mobile 開発ルール

## 環境変数

- **`eas.json` に環境変数の値を書かない**（gitに秘密情報を載せないため）
- 環境変数は `eas env:create` でEASサーバー側に登録する
- アプリ内では `process.env.EXPO_PUBLIC_*` で参照（`EXPO_PUBLIC_` プレフィックスによりMetroが自動インライン化）
- `app.config.ts` の `extra` + `expo-constants` パターンは不要

## コンポーネント作成時のガイドライン

### testID は新規ダイアログ・Page・主要 interactive 要素に必ず振る

E2E（Maestro）の selector を安定させるために以下のルールを守る。**「testID は後で E2E 担当が付ける」と先送りすると、後追い commit で testID を追加した時に build artifact が古くて Maestro が見つけられず時間を溶かす**（5/2 の `tasks.edit.dialog` 事故）。新規実装の段階で振ることが大事。

- **Page コンポーネント**（`*Page.tsx`）: ルート View に `testID={mobileTestIds.<feature>.page}` を振る。`apps/mobile/src/testing/testIds.ts` にエントリも追加する
- **Dialog / Modal**（`<ModalOverlay>` を含むコンポーネント）: ModalOverlay の `testID` prop に `mobileTestIds.<feature>.<dialogName>` を渡す
- **主要 action ボタン**（submit / save / delete confirm / FAB）: `testID={mobileTestIds.<feature>.<action>}` を振る
- **ユーザーが入力する TextInput**（タイトル・メモ・検索など）: `testID={mobileTestIds.<feature>.<inputName>}` を振る
- **リスト要素**（一覧の card / 各 row の edit/delete ボタン）: `<feature>.<element>.<id>` 形式の suffix ファクトリで動的に振る（例: `tasks.delete.<taskId>`、既存の `cardTestIds` パターン参照）
- 装飾用の `<View>` には testID を振らない（iOS XCUITest で flatten されて hierarchy に出ないことがあり、E2E から引けず時間を溶かす）

### 命名規則

`<feature>.<element>` のドット区切り階層。例:
- `tasks.page` / `tasks.add` / `tasks.create.dialog` / `tasks.create.titleInput` / `tasks.edit.delete`
- `notes.deleteConfirm.dialog` / `notes.deleteConfirm.confirm`
- `tabs.home` / `tabs.tasks`

testID 文字列は `apps/mobile/src/testing/testIds.ts` の `mobileTestIds` レジストリに集約する。コンポーネント側からは必ず `mobileTestIds.xxx.yyy` で参照（リテラル直書き禁止 — typo・命名揺れの温床）。

### testID を追加・変更したら artifact を再ビルド

testID は JS バンドルに焼き込まれるので、`.tsx` で testID を追加・変更したら **必ず `pnpm mobile:e2e:build`（iOS）または `pnpm mobile:e2e:build:android`（Android）で artifact を作り直す**。古い artifact のままでは Maestro が新 testID を見つけられず assertion が落ち続ける。判別: `assertVisible: id: <testID>` だけ落ちて `text:` は通る → 再ビルド必要。

### 200 行制限

1 ファイル 200 行以内を目標。E2E 用 testID 追加で行数が膨らんだら、`use<Feature>` フックや `<Feature>Footer` などにロジック・JSX を分割する。pre-existing で超えていた場合でも、編集タイミングで分割する。

## E2E（Maestro）

- **Maestro はターミナルから `maestro test` を直接実行する**（フロー間で XCUITest driver が再接続するとタブ状態がリセットされる等の不安定さを避けるため。5/2の教訓）
- driver が刺さったら `pkill -9 -f maestro-driver` でリセット
- **testID を `.tsx` に追加・変更したら必ず `pnpm mobile:e2e:build` で iOS sim artifact / `pnpm mobile:e2e:build:android` で APK を作り直す**（リリースビルドに JS バンドルが焼き込まれるため、古い artifact のままでは新 testID が見つからず assertion が落ち続ける。5/2 の `tasks.edit.dialog` 事故）
- **dev-client で Maestro を回すときは "Tools button"（floating gear）を OFF にする**。`common.menu`（hamburger 右上）の上に dev menu の floating button が乗って tap が奪われる。ただし dev menu の toggle は reload で復活するので、できれば `pnpm mobile:e2e` の build artifact 経由を使う
- **Maestro flow を新規・編集したら最低限 task / smoke / 該当 suite を 2 回連続実行して冪等性を確認する**。`flows/scripts/gen-run-tag.js` のような per-run unique tag を入れ忘れると 1 回目だけ通るゾンビが量産される
- 詳細は `apps/mobile/README.md` の Maestro E2E セクション、および `docs/ops/mobile.md` を参照

## ネイティブ実装
- **ネイティブAPI（WidgetKit, App Intents, AlarmManager等）を使う前に公式ドキュメントで制約を確認する**。EAS Buildは1回20-30分かかるため、コンパイルエラーでの失敗コストが大きい（Siri phrasesのString制約知らず→ビルド1回無駄、AlarmManager vs Chronometer→ビルド3回無駄の教訓）

## テーマ（ダークモード）
- nativewind の `setColorScheme()` は内部的に `Appearance.setColorScheme()` を呼ぶだけで、`colorSchemeObservable` を本番では更新しない。**pnpm patch (`react-native-css-interop`) で本番でも observable を同期更新するよう修正済み**（→ `docs/adr/20260402_nativewind_color_scheme_patch.md`）
- `Appearance.setColorScheme()` の結果は `Updates.reloadAsync()` で消える（JSだけでなくネイティブ側のAppearance overrideもリセットされる）
- テーマ設定は AsyncStorage (`actiko-v2-theme`) に永続化し、起動時に `useTheme` フックで読み込み→ `applyColorScheme` で適用

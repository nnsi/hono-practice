# mobile-layout TODO

別セッションで対応するタスクの控え。検出元: 2026-05-03 の Maestro iOS/Android 比較セッション。

## 1. タスクの完了済み表示を iOS に統一

### 現状の挙動差

| プラットフォーム | toggle 直後の見え方 |
|---|---|
| iOS | 完了 task は **「完了済みを表示 (N)」セクションに collapse**。同セクションには残らない |
| Android | 完了 task は同じセクション（例: 今日締切）に残り、**緑✓ + 完了:05/03 のメタ表示** |

### やること

- iOS の挙動（完了 → 完了済みセクションに collapse）に統一
- Android 側の `TaskCard` / `TasksPage` グルーピングロジックを修正
- 完了済みセクションの expand/collapse 状態は AsyncStorage に persist（iOS 既存実装に倣う）

### 検証

- `apps/mobile/.maestro/screenshot-phase8.yaml` を再実行し、iOS と Android の `phase8-02-tasks-after-toggle.png` で同じレイアウトになることを確認
- iOS スクショ参考: `/tmp/maestro-shots/ios-phase8/phase8-02-tasks-after-toggle.png`
- Android スクショ参考: `/tmp/maestro-shots/android-phase8/phase8-02-tasks-after-toggle.png`

### 関連ファイル候補

- `apps/mobile/src/components/tasks/TasksPage.tsx`
- `apps/mobile/src/components/tasks/TaskCard.tsx`
- `apps/mobile/src/components/tasks/useTasks*.ts`

---

## 2. Maestro chevron tap 座標を iOS 対応

### 現状

- `apps/mobile/.maestro/screenshot-phase11-empty.yaml` で `tapOn: point: "70%,6%"` を 10 回 repeat して Daily の日付を進める
- Android emulator-5554 (1080x2400) では chevron に当たって動く
- iOS sim (iPhone 16 Pro / iOS 26) では notch/Dynamic Island 込みで status bar が縦に厚く、`(70%, 6%)` は chevron 上の余白にヒットして 5/3 (日) のまま動かない

### やること

- 候補 A: `(70%, 8%)` か `(70%, 9%)` に下げて iOS/Android 両対応かを試す
- 候補 B: Daily ヘッダの date-nav ボタンに testID を振る（`daily.dateNav.next` / `daily.dateNav.prev`）。CLAUDE.md の testID ガイドラインに沿うのはこちら
- testID を追加する場合は `pnpm mobile:e2e:build:android` / `pnpm mobile:e2e:build` で artifact 再ビルド必須

### 関連ファイル候補

- `apps/mobile/src/components/daily/DailyPage.tsx`（または DateHeader 系）
- `apps/mobile/src/testing/testIds.ts`
- `apps/mobile/.maestro/screenshot-phase11-empty.yaml`

---

## 3. (参考) iOS sim でテーマ永続化が再現できなかった件

### 状況

- `screenshot-phase7.yaml` で Light → Dark → killApp + launchApp → settings 開く flow
- iOS sim では `phase7-05-settings-after-relaunch.png` が **Light モード白背景**（Dark にならず）
- Android emulator では Dark 維持 ✓
- **実機 iOS では問題なし**（ユーザー確認済み）→ sim 固有のクセと思われる

### 対応方針

- 実機で問題ない以上、優先度低
- 仮に追跡するなら: iOS sim の Appearance override 設定 / `Updates.reloadAsync()` 後の AsyncStorage 読み出しタイミングを sim でデバッグ
- もしくは Maestro flow 側で sim 固有の workaround を入れる（`xcrun simctl ui ... appearance dark`）

### このままにする場合

- mobile-checklist.md L450「テーマ永続化」は Android で ✓ 済み、iOS は実機でユーザー常用確認 → そのまま

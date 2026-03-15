# Architecture Refactoring Plan

## Purpose

このドキュメントは、現状の評価で挙げた優先度 `1` から `2` の改善項目を、実行可能なリファクタリング計画として整理したもの。

目標は以下の3点。

- アーキテクチャを重複の少ない形に収束させる
- 開発持続性を CI と自動化で底上げする
- offline-first を中核とした機能品質を引き上げる

## Scope

対象:

- `apps/backend`
- `apps/frontend`
- `apps/mobile`
- `packages/frontend-shared`
- `packages/sync-engine`
- `.github/workflows`
- `package.json`

対象外:

- `docs/todo/completed/**`
- `docs/todo/archived/**`

---

## 1. PR CI を作る

### Goal

`pull_request` 時点で破壊的変更を検出し、`master` / `release` へのマージ前に止める。

### Tasks

- `.github/workflows` に PR 用ワークフローを追加する
- 少なくとも以下を実行対象にする
  - workspace install
  - `pnpm run lint`
  - `pnpm run tsc`
  - `pnpm run test-once`
  - frontend build
  - backend の最低限の smoke check
- `paths` または差分判定を導入し、無駄なジョブ実行を抑える
- `deploy` 用 workflow と `verify` 用 workflow を分離する
- branch protection の前提となる job 名を固定する

### Definition of Done

- PR 作成時に自動で CI が走る
- CI fail 時に merge できない状態になる
- deploy workflow は push 後、verify workflow は PR 時という役割分担になる

### Expected Effect

- 壊れたコードの後追い修正を減らせる
- リファクタリングの心理的コストが下がる

---

## 2. Recording Modes のインターフェース定義

### Goal

6 つの Recording Mode（Timer / Counter / Manual / Numpad / Binary / Check）が満たすべき契約を型として明文化し、新モード追加時の事故を防ぐ。

### Background

現状、各モードは Component + Hook をセットで持つが、Hook が返すべき props / callbacks の型が暗黙知になっている。registry.ts がディスパッチするだけで、モードが満たすべきインターフェースの定義がない。

### Tasks

- 全モードの Hook 戻り値を横断調査し、共通部分と固有部分を整理する
- 共通インターフェース型を定義する（例: `RecordingModeHookResult`）
  - 最低限: `value: number`, `onConfirm: () => void`, `onCancel: () => void`, `isValid: boolean`
  - モード固有の拡張は Discriminated Union または generics で対応
- 各モードの Hook がその型を満たすよう修正する
- registry.ts をインターフェース型で型制約する
- 新モード追加手順を docs またはコメントに残す

### Definition of Done

- 全モードの Hook が共通インターフェース型を満たしている
- registry に型制約が入り、インターフェースを満たさないモードはコンパイルエラーになる
- 新モード追加時に「何を実装すればいいか」が型から読み取れる

### Expected Effect

- 新モード追加時の実装漏れがコンパイル時に検出される
- 既存モードの契約が明示され、リファクタ時の安全性が上がる

---

## 3. sync-engine と apps/\*/src/sync/ の責務整理

### Goal

sync ロジックの重複を解消し、同期順序・retry 戦略の変更が 1 箇所で済む状態にする。

### Background

現状 `apps/frontend/src/sync/` と `apps/mobile/src/sync/` のファイルがほぼ完全に重複している。

| ファイル | Web↔Mobile 差分 |
|---------|----------------|
| syncState.ts | 0 行 |
| syncActivityLogs.ts | import path のみ |
| syncGoals.ts | import path のみ |
| syncTasks.ts | import path のみ |
| syncGoalFreezePeriods.ts | import path のみ |
| syncEngine.ts | NetworkAdapter default 1 行 |
| syncActivities.ts | API\_URL 取得 + Icons 内 DB 問い合わせ（4 行） |
| initialSync.ts | DB 操作部分（~40 行） |

### 責務定義

- **`packages/sync-engine`** = sync の「何をやるか」
  - 個別 sync 関数のロジック（chunk → API → mark 結果）
  - オーケストレーション（依存順序、retry/backoff、concurrent guard）
  - syncState（generation 管理）
  - 既存の chunkedSync、mappers、authenticatedFetch
- **`apps/*/src/sync/`** = sync の「何を使ってやるか」
  - プラットフォームアダプタ（NetworkAdapter、StorageAdapter）
  - 具体的なリポジトリ・apiClient の配線（wiring）
  - React hooks（useSyncEngine）

### Tasks

#### Phase 1（ロジック移動、DB 抽象不要）

- `syncState` → `packages/sync-engine` にそのまま移動
- `syncActivityLogs`, `syncGoals`, `syncTasks`, `syncGoalFreezePeriods` → factory 化して `packages/sync-engine` へ
  - 依存（repository, apiClient, getGeneration）を引数で受け取る `createSyncXxx()` 形式
- `syncEngine` orchestration → `createSyncEngine(syncFunctions, defaultNetworkAdapter)` factory 化
- 両 apps の `src/sync/` は wiring（factory 呼び出し + アダプタ注入）のみに縮小
- 既存テストを `packages/sync-engine` 側へ移動

#### Phase 2（DB 抽象が必要）

- `syncActivities`（syncActivityIcons 内の DB 問い合わせ差分を repository interface に吸収）
- `initialSync`（clearLocalData、authState 書き込み、count 確認、transaction API の差分を adapter 化）
  - repository interface に `clearAll()` 等を追加するか、transaction runner を引数で受け取る形にする

### Definition of Done

- Phase 1: 個別 sync 関数と orchestration の本体が `packages/sync-engine` に 1 箇所
- Phase 1: Web/Mobile の `src/sync/` は adapter + wiring + hooks のみ
- Phase 2: initialSync のコアロジックも共有化されている

### Expected Effect

- 同期順序や retry 変更が 1 箇所の修正で済む
- 新テーブルの sync 追加時に factory パターンに従うだけで両プラットフォームに反映される

---

## 4. mobile に typecheck / lint / test を入れる

### Goal

`apps/mobile` を運用上の検証対象に昇格させる。

### Tasks

- `apps/mobile/package.json` に以下の scripts を追加する
  - `lint`
  - `typecheck`
  - `test`
- mobile 向け test runner を定義する
  - 既存の Vitest を流用するか、Expo 向け設定を追加する
- mobile 単体で最低限通すべきテスト対象を決める
  - sync
  - repositories
  - hooks
  - utils
- root `package.json` に mobile を含む検証コマンドを追加する
- CI に mobile の typecheck / lint / test を組み込む

### Definition of Done

- mobile 変更時に CI が自動検証する
- mobile を含む workspace 全体で `lint` と `typecheck` が通る
- mobile の主要ロジックに継続的な test 実行経路がある

### Expected Effect

- Web と mobile の品質差が縮まる
- shared package 変更時の破壊を検知しやすくなる

---

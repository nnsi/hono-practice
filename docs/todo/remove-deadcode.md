# デッドコード除去

## 背景
2026-04-10 に grep → knip で調査し、一部（依存削除・feature-sync barrel整理・error クラス削除・recording-modes barrel削除）は対処済み。残りをここで追跡する。

knip 調査結果の詳細: 各 workspace 個別実行（`pnpm dlx knip --workspace <path>`）。`apps/mobile` と `packages/domain` / `packages/types` はスキャン失敗。

---

## 1. knip の本格導入

- [x] `knip` を root の devDependencies に追加
- [x] `knip.json` を作成し、以下を設定:
  - [x] `apps/backend`: `wrangler.toml` の main エントリ (`apps/backend/server.cf.ts`) を entry に登録（偽陽性回避）
  - [x] `apps/mobile`: metro.config.js の tailwind.config 参照エラーで落ちるので ignoreWorkspaces or workaround（`metro: false` で Metro plugin を無効化）
  - [x] `packages/domain` / `packages/types`: Module load error の原因を特定してから含める（mobile の metro プラグイン経由のクラッシュが原因。metro 無効化で解消）
- [x] 一度全体を通しで実行して、現時点のベースラインを取る
- [ ] `ci-check` に組み込むかは手動運用してから判断（最初は開発者が任意で実行する形）
- [ ] README or CLAUDE.md に「依存変更・リファクタ後は `pnpm knip` を回す」ガイドを追加

---

## 2. スキャン失敗の原因調査

knip が通らない workspace を特定・修復する。dead code が埋もれている可能性あり。

- [x] `packages/domain` の `Module load error` 原因特定（tsconfig or package.json 構造？）
- [x] `packages/types` の `Module load error` 原因特定
- [x] `apps/mobile` の `metro.config.js` が存在しない `tailwind.config` を require している件
  - 原因: nativewind が tailwindcss の `load-config.js` を eager 呼び出し → cwd 相対で `tailwind.config` を探す → ルートで実行すると解決失敗 → metro plugin がクラッシュ → reverse dep の domain/types も巻き添え
  - 対応: `knip.json` で `"metro": false` 指定（Metro plugin 無効化）
- [x] 上記修正後、再度 knip を回して追加の dead code を洗い出す

---

## 3. backend の未使用 export 対処（調査済み・対処保留分）

### 3.1 createXXXRoute ファクトリ廃止（保留中）
`export function createXxxRoute() {...}` と `export const xxxRoute = createXxxRoute()` の二重定義になっており、factory 側は誰も使っていない。

- [ ] `apps/backend/feature-sync/activity/activitySyncRoute.ts:12` `createActivitySyncRoute`
- [ ] `apps/backend/feature-sync/activity-log/activityLogSyncRoute.ts:12` `createActivityLogSyncRoute`
- [ ] `apps/backend/feature-sync/goal/goalSyncRoute.ts:13` `createGoalSyncRoute`
- [ ] `apps/backend/feature-sync/goal-freeze-period/goalFreezePeriodSyncRoute.ts:13` `createGoalFreezePeriodSyncRoute`
- [ ] `apps/backend/feature-sync/task/taskSyncRoute.ts:12` `createTaskSyncRoute`
- [ ] `apps/backend/feature/contact/contactRoute.ts:17` `createContactRoute`
- [ ] **方針判断**: factory を消すか、`xxxRoute` インスタンスを消して factory のみにするか、テスト用途で factory を残すか（note は既にテストで factory 使用中）

### 3.2 Polar 関連（保留中）
Polar 廃止済みらしいが、コードが残っている。

- [ ] `apps/backend/feature/webhook/polarWebhookSchema.ts` が丸ごと未使用（`polarSubscriptionSchema`, `POLAR_SUBSCRIPTION_EVENTS`, `PolarSubscriptionEvent` type）
- [ ] `apps/backend/feature/webhook/polarWebhookRoute.ts` も関連削除候補か調査
- [ ] `apps/backend/feature/webhook/polarSubscriptionMapping.ts` も knip で "unlisted" 扱い。使用状況確認
- [ ] **方針判断**: いつ削除するか。他に Polar 関連のファイル・DB カラム・環境変数はあるか

### 3.3 その他の未使用 export
- [x] `apps/backend/feature/goal/goalUsecase.ts:21` `goalEntityToResponse` 削除
- [x] `apps/backend/feature/goal/goalUsecase.ts:16` type `Goal` 削除
- [x] `apps/backend/feature/auth/authTokenUtils.ts:7` `ACCESS_TOKEN_EXPIRES_IN_SECONDS` 削除（内部化）
- [x] `apps/backend/feature/auth/authTokenUtils.ts:9` `REFRESH_TOKEN_EXPIRES_IN_MS` 削除（内部化）
- [x] `apps/backend/feature/admin/test/adminUserDeletionUsecase.setup.ts:22` `fakeTxRunner` export を内部化（もしくは削除）
- [x] `apps/backend/middleware/rateLimitMiddleware.ts:13` `tokenRateLimitConfig` 削除（`rateLimitConfigs.ts:21` に重複 export あり、こちらが本物）
- [x] `apps/backend/middleware/rateLimitMiddleware.ts:133` `checkRateLimit` 関数削除
- [x] `apps/backend/middleware/rateLimitMiddleware.ts:8` type `RateLimitConfig` 削除
- [x] `apps/backend/middleware/rateLimitMiddleware.ts:21` type `RateLimitResult` 削除
- [x] `apps/backend/app.ts` の `app` と `default` の二重 export を統一（`export default app` を削除、named export のみ）
- [x] `apps/backend/app.ts:166` type `AppType` 削除（用途確認。Hono の RPC 型では？）→ **維持**: `packages/types/api.ts` で re-export して Hono RPC に使用中（knip の false positive）

### 3.4 未使用 type 定義
- [x] `apps/backend/lib/tracer.ts:1` type `SpanData`（内部化）
- [x] `apps/backend/lib/logger.ts:1` type `LogLevel`（内部化）
- [x] `apps/backend/feature/auth/authUsecase.ts:19-22` type `AuthOutput`, `JwtVerifyFn`, `LoginInput`（re-export を削除）
- [x] `apps/backend/feature/auth/authUsecaseTypes.ts:26` type `JwtVerifyFn`（重複、削除）
- [x] `apps/backend/feature/subscription/subscriptionHandler.ts:7` type `SubscriptionHandler`（内部化）
- [x] `apps/backend/middleware/waeWriter.ts:12` type `WAEEntry`（内部化）

---

## 4. frontend の未使用 export 対処

### 4.1 型定義の整理
- [x] `apps/frontend/src/db/schema.ts:41` `ActikoDatabase` export 不要化（内部化）
- [x] `apps/frontend/src/db/schema.ts:18-34` 未使用 Dexie 型: `DexieGoal`, `DexieGoalFreezePeriod`, `DexieTask`, `DexieNote`, `DexieActivityIconDeleteQueue`, `DexieAuthState`（内部化）
- [x] `apps/frontend/src/components/tasks/types.ts:2-3` `GroupedTasks`, `GroupingOptions`
- [x] `apps/frontend/src/hooks/useCSVImport.ts:24,115,123` `ColumnMapping`, `ActivityLogValidationError`, `ImportProgress`, `ImportResult`
- [x] `apps/frontend/src/hooks/useTimer.ts:52` `getTimerStorageKey` export 不要化
- [x] `apps/frontend/src/components/common/useLogForm.ts:11` type `UseTimerReturn`
- [x] `apps/frontend/src/components/setting/useAppSettings.ts:13` type `AppSettings`
- [x] `apps/frontend/src/components/goal/types.ts:7` type `GoalStats`

### 4.2 未使用 barrel 残り
- [x] `apps/frontend/src/components/subscription/index.ts` が orphaned 扱い。削除可能か確認（削除済み）

### 4.3 uuid の DI 化（技術的負債）
現状: `apps/frontend` の本番コードは uuid を使わないが、`vi.mock("uuid")` のために devDependency として残している。

- [x] `packages/frontend-shared/repositories/*.ts` の `v7 as uuidv7` を DI 化
  - `newXxxRepository(adapter, generateId = uuidv7)` のシグネチャで後方互換
- [x] frontend-shared / apps/frontend のテストを DI 形式に書き換え（apps/mobile は uuid を production dep として保持しているため対象外）
- [x] `vi.mock("uuid")` を frontend-shared / apps/frontend から全削除
- [x] `apps/frontend/package.json` から uuid devDependency を削除

---

## 5. frontend-shared の未使用 export

- [x] `packages/frontend-shared/recording-modes/types.ts` の `RecordingModeViewModelBase` (49), `UncoveredRecordingModes` (74), `RecordingModeViewModel` (80) が knip では未使用判定（実使用無し、削除）
- [x] `packages/frontend-shared/recording-modes/modes/createUseCounterMode.ts:16` type `CounterModeViewModel` が unused 判定（他 ViewModel も同様）→ `knip.json` の `ignoreExportsUsedInFile: { type: true }` で抑止済み。型は `RecordingModeViewModelMap` 内で使われているので維持
- [x] `packages/frontend-shared/hooks/useGoalHeatmap.ts:28` type `HeatmapGrid`（内部化）
- [x] `packages/frontend-shared/hooks/useGoalHeatmap.ts:46` type `GoalHeatmapViewModel`（内部化）
- [x] `packages/frontend-shared/repositories/syncHelpers.ts:29` type `BaseSyncDbAdapter`（削除）
- [x] `packages/frontend-shared/repositories/index.ts:14` type `BaseSyncDbAdapter` re-export（削除）
- [x] `packages/frontend-shared/repositories/index.ts:15` `filterSafeUpserts` export（barrel の re-export 削除。関数本体は各 repository logic が直接 import しているので維持）

---

## 6. その他のクリーンアップ

- [x] `apps/backend/feature/task/test/taskRoute.test.ts:229-242` コメントアウト済みテスト（Zod v4 で `z.iso.date()` サポート待ち）
  - Zod v4 で `z.iso.date()` 利用可能を確認。`GetTasksRequest` を `z.iso.date().optional()` に変更、テストを有効化
- [ ] `apps/backend/feature/apiKey/apiKeyUsecase.ts` の KV キャッシュ TODO 4箇所（75, 81, 89, 94）
  - 実装予定があるか判断 → **要ユーザー判断**
- [ ] `apps/frontend/src/sync/initialSync.ts:102` / `apps/mobile/src/sync/initialSync.ts:111` freezePeriods の後方互換 `.catch(() => null)`
  - 互換期間終了判断 → **要ユーザー判断**
- [x] `drizzle-kit` が root と backend の両方に devDep として存在していた → backend 側は削除済み。root 側にまとまっていることの確認（root のみに存在を確認済み）

---

## 進め方

1. まず **セクション1 (knip導入)** と **セクション2 (スキャン失敗調査)** を先に済ませる。ベースラインを作るため
2. 次に **セクション6** の判断不要な既知の TODO を片付ける
3. **セクション3.3, 3.4, 4.1, 5** は機械的に削除可能なものから順次
4. **セクション3.1 (createXXXRoute), 3.2 (Polar)** は設計判断が必要なのでまとめてユーザーと相談
5. **セクション4.3 (uuid DI化)** は独立したリファクタなので別セッションで

## 7. 追加検出項目（次回以降）

2026-04-11 セッションの knip 最終実行で残っている未使用 export / type。本セッションでは todo の対象外のため未対応。各項目は利用箇所をさらに調査してから削除するか、意図があるなら `/** @public */` コメント or knip ignore で意図を明示する。

### 7.1 domain 層の未使用 export（11件）

- [ ] `packages/domain/subscription/subscriptionSchema.ts:58` `isSubscriptionActive` 関数
- [ ] `packages/domain/subscription/subscriptionSchema.ts:67` `isSubscriptionPremium` 関数
- [ ] `packages/domain/subscription/subscriptionSchema.ts:73` `isSubscriptionInTrial` 関数
- [ ] `packages/domain/subscription/entitlement.ts:6` `canUseVoiceRecord`
- [ ] `packages/domain/subscription/entitlement.ts:9` `canUseWatch`
- [ ] `packages/domain/subscription/entitlement.ts:12` `maxWidgetCount`
- [ ] `packages/domain/apiKey/apiKeySchema.ts:76` `maskApiKey`
- [ ] `packages/domain/task/taskSchema.ts:80` `createArchivedTaskEntity` 関数
- [ ] `packages/domain/activity/activitySchema.ts:43` `iconTypeSchema`
- [ ] `packages/domain/activity/activitySchema.ts:44` type `IconType`（上記 schema の型）
- [ ] `packages/domain/goal/goalSchema.ts:86` `createGoalBalance` 関数

domain 層の「pure function として用意したが未使用」系。ドメインロジックの public API として意図的に公開している可能性あり。削除前に「なぜこれが存在するか」の判断必要。`createGoalBalance` は `packages/domain/index.ts` で `export * from "./goal/goalBalance"` 経由で公開されているが、他のもの（subscription/apiKey/task/activity）は barrel から外れている。

### 7.2 backend 未使用 export（1件）

- [ ] `apps/backend/middleware/rateLimitConfigs.ts:21` `tokenRateLimitConfig`
  - 経緯: 元々は `rateLimitMiddleware.ts` から re-export されていた（section 3.3 で re-export を削除済み）。再 export を消した結果、この config 自体が使われない状態に。`rateLimitConfigs.ts` にある他のconfig（`contactRateLimitConfig` 等）は利用されている

### 7.3 domain の未使用 barrel（10件、既出）

`packages/domain/*/index.ts` の 10 ファイルが未使用 barrel として検出される（activity, activityLog, apiKey, auth, goal, note, subscription, sync, task, user）。domain package の main entry (`packages/domain/index.ts`) は curated な re-export を使っており、サブディレクトリ barrel を経由しない。削除しても問題なさそうだが、将来 domain の public API として再利用される可能性もある。

- [ ] `packages/domain/activity/index.ts` 以下 10 ファイルの barrel を一括削除するか方針決定

### 7.4 既出の保留項目（参考リンク）

- section 3.1 createXxxRoute ファクトリ（6件） — 「そのまま」方針で保留中
- section 3.2 Polar 関連（`polarWebhookSchema` 等） — 「削除しない」方針で保留中
- section 6 `apiKeyUsecase.ts` の KV TODO、`initialSync.ts` の freezePeriods catch — 「残す」方針

## 参考
- 対処済み内容は `docs/diary/20260410.md` 参照

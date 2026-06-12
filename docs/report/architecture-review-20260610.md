# アーキテクチャ精査レポート（拡張性・技術負債）
> 実施日: 2026-06-10

## 対象範囲
- バックエンド API 設計: `apps/backend`（feature / feature-sync / middleware / lib / app.ts）+ `infra/drizzle`
- Web フロントエンド: `apps/frontend` / `apps/admin-frontend`
- モバイル: `apps/mobile`（ネイティブウィジェット Swift / Kotlin 含む）
- 型共有・パッケージ構造: `packages/*`（types / domain / sync-engine / frontend-shared / platform / auth-client）
- ビルド・CI 基盤: ルート `tsconfig.json` / `package.json` / `.github/workflows` / `scripts/`

セキュリティ観点は別レポート（`security-audit-20260610.md`）で実施済みのため対象外。

## 実施方式
4レーンの並列アーキテクチャレビュー（Backend API / Web フロントエンド / Mobile / 型共有・monorepo 基盤）の結果を統合し、影響の大きい指摘は親レーンで実コードに対して裏取りした。

## 総合評価

| 領域 | 拡張性スコア | 一言評価 |
|---|---|---|
| Backend API | 7.5 / 10 | 層構造・テストは高水準。API 契約の細部（ステータスコード等）に不統一 |
| Web フロントエンド | 6.5 / 10 | オフラインファーストの骨格は正しいが、新エンティティ追加コストが高い |
| Mobile | 7.5 / 10 | ロジック共有は業界水準以上。ネイティブウィジェットが無テスト・二重管理 |
| 型共有・monorepo 基盤 | 7.5 / 10 | Hono RPC + domain 純粋性が機能。依存宣言と tsgo 採用に基盤リスク |

**全体: 7 / 10。** アーキテクチャの「背骨」（route→usecase→repository、ファクトリ関数 DI、sync-engine 共有、Hono RPC 型推論、property test）は一貫して良く設計されており、日常的な機能追加は安全にできる。一方で、技術負債は「壊れているコード」ではなく **「同じものを2箇所以上で手動維持している箇所」に集中**しており、放置すると新エンティティ追加のたびに複利で効いてくる。

### 横断テーマ: 最大の負債は「新エンティティ追加コスト」
新しいオフラインファースト・エンティティを1つ追加すると、最低でも以下を触る:

- `packages/sync-engine`: push 新規 + parseResponses / createInitialSync / createSyncEngine / apiMappers（5ファイル）
- Web: Dexie schema + repository 新規 + syncEngine.ts + initialSync.ts(4ファイル)
- Mobile: migrationSql.ts + repository 新規 + syncEngine.ts + initialSync.ts（4ファイル）
- Backend: feature 新規（scaffold あり）+ `app.ts` 手動登録 + drizzle schema 手動登録
- ウィジェットが参照する場合: Swift + Kotlin も追加

**合計 15 ファイル前後**。型シグネチャにエンティティリストが散在しているためコンパイラが漏れを拾える点は救いだが、Web/Mobile の `initialSync.ts` / `syncEngine.ts` がほぼコピペ並列維持なので「片方だけ更新して乖離」が構造的に起きうる（過去にも Web/Mobile 非対称の見落としが複数回発生している）。

---

## 領域別の詳細

## 1. Backend API 設計

### 定量データ
- feature 18 + feature-sync 6、ソース 234 ファイル、テスト 76 ファイル
- route を持つ全 feature に route.test.ts が存在（カバレッジの穴なし）
- 200行超は `feature/task/taskUsecase.ts`（259行）の1件のみ

### 良い点
- `route → handler → usecase → repository` の4層が大多数の feature で忠実に守られている。`c.var.h` による DI パターンも統一
- PGlite ベースの統合テスト環境が整備され、実 FK 制約込みで検証できる
- インデックスが実クエリに対応した形でコメント付き定義されており意図が明確

### 問題点

**[中] POST 作成のステータスコードが 200 / 201 で不統一**
- 201 を返すのは `goalRoute.ts:97` / `goalFreezePeriodRoute.ts:54` / `contactRoute.ts:48` の3つのみ。task / note / activity / activityLog / apiKey は 200
- DELETE も `{ message: "success" }` / `{ success: true }` / 204 No Content の3形式が混在
- クライアントのレスポンス型生成と API ドキュメントの一貫性に直結する

**[中] webhook feature が handler 層をスキップ**
- `feature/webhook/polarWebhookRoute.ts:93` — usecase を route に直接インラインし、`switch(payload.type)` のビジネスロジックが route 内にある。層構造規約の唯一のまとまった違反箇所

**[中] scaffold（generate-feature.js）が `app.ts` と `infra/drizzle/schema/index.ts` への登録を自動化していない**
- 新 feature 追加時の手動2箇所登録が漏れると runtime エラーになる事故パターン

**[中] sync の `since` パラメータ検証が機能間で不統一**
- `goalSyncRoute.ts` / `goalFreezePeriodSyncRoute.ts` は `safeParse` + 400 だが、task / note / activityLog の sync route は生文字列をそのまま渡している

**[中] 論理削除・物理削除の方針がテーブルごとに異なり、schema にコメントがない**
- activity / task / note / user 系は `deletedAt` あり、`userSubscription` / `contact` は物理削除。意図的と思われるが新規開発者には判断材料がない

**[低] 重複コード**
- `filterLogsByActivity` が `activitygoal/activityGoalService.ts:82` と `activityGoalAuxService.ts:9` に同一定義
- `convertImageUrlsToBase64` 相当が `activityRoute.ts:24` と `activityLogRoute.ts:23` に重複
- `REFRESH_TOKEN_ROTATION_GRACE_MS` が `refreshTokenRepository.ts:12` で再エクスポートされているが利用者なし

**[低] try-catch 禁止規約と実装の矛盾**
- `activityLogBatchUsecase.ts:48`（バッチ部分失敗）と `activityIconUsecase.ts:83`（R2 補償トランザクション）は正当な理由のある try-catch だが、`apps/backend/CLAUDE.md` の規約に例外条項がない

---

## 2. Web フロントエンド

### 定量データ
- ルート 14、コンポーネント(.tsx) 110、非テストソース 213 ファイル、テスト 22 ファイル（テスト率 ~10%）
- sync-engine はテスト率 ~68%、frontend-shared は ~41% と共有層は手厚い
- 200行超は5件（CSV インポート関連に集中）

### 良い点
- 主要データフックは全て `useLiveQuery` + Dexie repository 経由で統一。`useEffect` での API fetch は皆無、TanStack Query は規約通りサーバー専用データのみ
- コロケーション型フック（`use*.ts` 分離）が全フィーチャで一貫
- `goal.totalTarget` 等のサーバー計算値を表示に使わず `calculateGoalBalance()` でローカル算出する規約も遵守

### 問題点

**[高] `apps/frontend/src/sync/initialSync.ts`（176行）と `apps/mobile/src/sync/initialSync.ts`（164行）がほぼコピペ**
- `DELTA_SYNC_RESOURCES` / `LEGACY_BOOTSTRAPPED_RESOURCES` 定数と `fetchAllApis` の組み立てが二重維持。`syncEngine.ts` も同様
- 新エンティティ追加時の「Mobile 側更新漏れ」リスクの最大の発生源

**[高] Web 固有アダプター層のテストがほぼゼロ**
- 16 コンポーネントディレクトリ中 9 つが無テスト（actiko / daily / notes / csv / setting / stats）。ロジックは frontend-shared でテスト済みだが、Dexie 接続部（`useGoalsPage.ts`、`useGoalCard.ts` 等）は対象外

**[中] リポジトリバイパスの散発**
- `LogFormBody.tsx:54-68` — バイナリモード加算で `db.activityLogs.update()` を直接呼び、`_syncStatus: "pending"` を手書き
- `TaskCard.tsx:54` / `GoalStatsDetail.tsx:62` — コンポーネント内 `useLiveQuery` が repository を通さない（read-only なので実害は小）

**[中] `syncGoalFreezePeriods` だけ Hono typed client でなく `customFetch` + 文字列 URL**（`apps/frontend/src/sync/syncEngine.ts:95-103`）。API パス変更時に型エラーが出ない

**[中] admin-frontend が `packages/frontend-shared` を一切使っていない**
- 日付フォーマット等を自前で組み直しており実質別プロジェクト。独立性は意図的としても、共有できるユーティリティまで重複している

**[低] `TaskCard` が枚数分 `useActivities()` を呼ぶ（useLiveQuery の重複実行）、GoalCard 系の4段プロップドリル、`useGoalCard.ts:21` の localStorage 直読み（非リアクティブ）**

---

## 3. Mobile

### 定量データ
- 画面 9（expo-router）、ソース 251 ファイル、単体テスト 21 + Maestro E2E 89 フロー
- ネイティブ: Swift 29 ファイル / 2003行、Kotlin 19 ファイル / 1694行（いずれもテストゼロ)
- frontend-shared 利用はソースの ~32%。200行超は実質 `CSVImportModal.tsx`（219行）の1件

### 良い点
- 記録モード6種のロジックが `packages/frontend-shared/recording-modes/` に完全集約され、Mobile 側は数行でインスタンス化（`useBinaryMode.ts` は7行）。ビジネスロジックの二重実装はほぼ排除
- sync-engine は DB アダプタ DI で完全共有。Maestro E2E 89 フロー + EAS Workflows の PR 自動実行は高水準

### 問題点

**[中] ネイティブウィジェットの DB スキーマが3箇所で手動同期**
- `apps/mobile/src/db/migrationSql.ts`（TS）と `targets/widget/WidgetDbHelper.swift`、`modules/timer-widget/.../WidgetDbHelper.kt` が同じ SQLite スキーマを前提に動くが、Swift/Kotlin 側に migration はなく自動テストもゼロ。カラム追加・リネーム時のウィジェットクラッシュリスク

**[中] Widget プロセスからの書き込みを RN 側 `useLiveQuery`（dbEvents イベント駆動）が検知できない**
- アプリを開いた際の sync まで旧状態が表示される。Web（Dexie）には同問題なし

**[中] `tabPreferenceStore.ts` が Web（190行）と Mobile（199行）で並列維持**
- 差分はストレージ API（localStorage vs AsyncStorage）のみ。`StorageAdapter` 抽象を使えば frontend-shared に統合可能

**[中] `StorageAdapter` の同期インターフェースと AsyncStorage の非同期性のギャップ**
- `packages/platform/adapters.ts:7-9` は同期 `getItem` だが、Mobile はインメモリキャッシュ前段で回避（`rnPlatformAdapters.ts:52-90`）。起動直後の stale 読み取り競合が潜在。`useTimer.ts:36-69` でも別のキャッシュ層を独自実装しており回避策が増殖中

**[中] nativewind が `react-native-css-interop` への pnpm patch に依存**（ADR 記録済み）。アップグレードコストが恒常的に高い

**[低] `CSVImportModal.tsx` のフック未分離（219行）、`app/_layout.tsx:86-115` の AsyncStorage 直読み、`GoalCard.tsx:129-140` の日本語ハードコード（i18n 未対応）**

---

## 4. 型共有・monorepo 基盤

### 定量データ
- packages 8 + apps 5、全テスト 211 ファイル、CI 9 ジョブ（変更検知で条件実行）
- `as unknown as` / `as any`: backend 23 / frontend 50 / packages 6
- knip 検出: unused files 10 / unused exports 19 / unused deps 3

### 良い点
- 型の流れが明確: drizzle schema → domain entity → response schema → `hc<AppType>`（Hono RPC）→ `apiMappers.ts` → Dexie record。`apiMappers.ts` は `as` キャストゼロで全フィールド明示変換
- `packages/domain` は dayjs / uuid / zod のみに依存する純粋ドメイン層で、property test 4本が時刻ロジックをガード
- 循環依存なし。ADR 53件で設計判断の追跡可能性が高い

### 問題点

**[中] `workspace:*` 宣言の欠落**
- `apps/backend`（277箇所で import）/ `apps/frontend` / `packages/types` / `packages/sync-engine` が `@packages/domain` 等を import しているのに package.json に依存宣言がなく、tsconfig paths だけで解決している。pnpm の依存グラフが実態を反映せず、knip / renovate / strict モードの信頼性を損なう。ルート CLAUDE.md 自身が「tsconfig paths と module resolution（workspace:* 宣言）は別物」と注意喚起している項目そのもの

**[中] `tsgo`（`@typescript/native-preview` 7.0.0-dev）が型チェックの主役**
- dev スナップショットを CI の正に使っており、TS 本体側の挙動変化で型エラーが突然増減するリスク。採用理由の ADR がない

**[中] `packages/types`（API レスポンス schema）と `packages/domain`（エンティティ schema）の zod 二重管理**
- `GetActivitiesResponse.ts` と `activitySchema.ts` が同一フィールド群を別々にスキーマ化。意図的な分離（フラット vs discriminated union）ではあるが、フィールド追加時に2箇所更新が必要

**[中] `packages/domain/index.ts:8` の `ActivityRecord as Activity` エイリアス**
- zod 由来の `Activity`（discriminated union）と Dexie 用 `ActivityRecord` の2つの "Activity" が混在し、import 元によって別物になる。レビュー時の誤解リスク

**[低] zod バージョン不統一**
- frontend のみ `^4.3.6`、他は `^4.0.1`。zod は pnpm.overrides に入っていない（root の `^4.0.1` は devDependencies）

**[低] ドキュメント乖離**
- `.claude/rules/frontend-offline-first.md:29` が廃止済みの `packages/types-v2` を案内している（実体は `packages/types` に統合済み）

**[低] デッドコード**
- `packages/domain` のサブディレクトリ barrel `index.ts` 13本が全て未使用（深いパス直 import が常態化）
- 未使用依存: frontend の `react-markdown` / `rehype-sanitize`、frontend-shared の `hono`、sync-engine の `fast-check`
- knip が CI に未組み込みのため、蓄積に気づけない

---

## 優先度順 改善ロードマップ

> 2026-06-12: P1〜P5 すべて実装済み（チェックボックスの注記は実装時の判断・差異）。同日、中長期4項目と sync 欠損の不審点もユーザー方針決定の上で対応済み（下記参照）。

### P1: Web/Mobile の sync 組み立て（initialSync / syncEngine）を共通化する
`DELTA_SYNC_RESOURCES` 等の定数と fetchAllApis の組み立て共通部を `packages/sync-engine` に移し、各プラットフォームは HTTP クライアントと DB アダプタの差分だけを渡す。**新エンティティ追加コスト（15ファイル前後）と Web/Mobile 乖離リスクの両方に効く、費用対効果最大の一手。** 同時に `syncGoalFreezePeriods` の `customFetch` を Hono typed client に揃える。

- [x] initialSync の組み立て共通部を `packages/sync-engine` に集約（`createV2InitialSync`。Web 176行→100行、Mobile 164行→97行。リソース定数・fetch組み立て・writeAllData は共有化され、プラットフォームはエンドポイントとDB配管のみ注入）
- [x] syncEngine の組み立て共通部を集約（`createV2SyncFunctions`。あわせて Web 側に欠けていた push エラーレポーターを Mobile と対称に追加）
- [x] `syncGoalFreezePeriods` を Hono typed client に移行（pull/push とも `customFetch` + 文字列 URL を廃止）

### P2: 基盤の整合性修正（小粒・低リスク・即効）
- [x] `workspace:*` 宣言を backend / frontend / types / sync-engine に追加
- [x] zod のバージョン統一（全 package.json の宣言を `^4.3.6` に統一。`pnpm.overrides` への追加は `@tanstack/router-plugin` が zod 3.x API に依存しており transitive dep を壊すため見送り）
- [x] `.claude/rules/frontend-offline-first.md` の `types-v2` 記述を修正
- [x] 未使用依存（react-markdown / rehype-sanitize / hono / fast-check）を削除
- [x] knip を CI に追加（ゲートは高シグナルな `files,dependencies,unlisted,binaries` に限定。unused exports は判断を要する既存項目が残るため対象外。domain サブディレクトリの未使用バレル index.ts 10本も削除済み）

### P3: API 契約の統一（クライアント型生成に影響するため早めに）
POST 作成を 201、DELETE を 204 に統一し、sync route の `since` バリデーションを `safeParse` + 400 で揃える。破壊的変更になるためクライアント側（apiMappers / sync-engine のレスポンス処理）と同一 PR で対応する。外部公開の `/api/v1` 契約は変更しない。

- [x] POST 作成を 201 に統一（activity / activityLog / note / task / apiKey / aiActivityLog。**注**: `/api/v1` は内部 route を再マウントしているため 201 を継承する。2xx 判定のクライアントには影響なし）
- [x] DELETE レスポンスを `{ success: true }` に統一（204 ではなくこちらを採用。クライアントが `.json()` でパース済みのため 204 だと破壊的になる）
- [x] sync route の `since` バリデーションを `safeParse` + 400 で統一（共通 `parseSince` ヘルパーを `feature-sync/shared/` に新設）

### P4: ネイティブウィジェットのスキーマ結合の明示化
`migrationSql.ts` にウィジェットが参照するカラムの注記を入れ、スキーマ変更時に Swift/Kotlin 影響を検出するチェックスクリプト（`scripts/check-*-rules.js` と同系統）を追加する。ウィジェット本体のテスト整備は長期課題として、まず「無音で壊れる」経路を塞ぐ。

- [x] `migrationSql.ts` にウィジェット参照カラムの注記を追加（V1–V6 を `migrationSqlV1.ts` に分離し、先頭に参照テーブル・カラムの全リストと対象ネイティブファイルを明記）
- [x] スキーマ整合チェックスクリプト `scripts/check-widget-schema.js` を追加し `guard:widget-schema` として ci-check に組み込み（`--self-test` 付き）

### P5: 重複ロジックの集約
- [x] `tabPreferenceStore.ts` を storage DI で frontend-shared に統合（`createTabPreferenceStore`。Web 190行→70行、Mobile 199行→41行。公開 API・ストレージキーは不変、`packages/platform` は未変更）
- [x] backend の `filterLogsByActivity` の重複排除（`activitygoal/filterLogsByActivity.ts` に集約）
- [x] backend の `convertImageUrlsToBase64` の重複排除（`lib/convertActivityIconUrls.ts` に集約）
- [x] scaffold（generate-feature.js）の `app.ts` / schema index 自動登録（冪等チェック・フォールバック付き。schema export は generate-domain.js 側に実装）

### 中長期項目（2026-06-12 方針決定・対応済み）
- [x] **tsgo dev 版の扱い**: 継続を決定し、採用理由と出口条件（TS7 stable で移行）を `docs/adr/20260612_tsgo_typecheck.md` に記録
- [x] **`Activity` 型エイリアスの整理**: `packages/domain/index.ts` の `ActivityRecord as Activity` / `ActivityKindRecord as ActivityKind` エイリアスは実利用ゼロと判明したため削除（リネーム作業は不要だった）
- [x] **admin-frontend の frontend-shared 利用**: 「純粋ユーティリティのみ共有」と決定。ただし調査の結果 frontend-shared に admin の日付フォーマットと同等の関数が存在せず、現時点で共有対象なし（無理な共通化はせず、調査中に見つかった `toLocaleString` 規約違反2件のみ dayjs に修正）
- [x] **Widget → RN の変更通知**: 現状の「フォアグラウンド復帰時 sync」を仕様として許容し、再評価条件（Live Activity 等）を `docs/adr/20260612_widget_db_write_visibility.md` に TODO として記録

### 追加修正（2026-06-12）: initialSync の best-effort リソースの欠損経路
notes / goalFreezePeriods の fetch が null フォールバックした場合、従来は失敗リソースも bootstrapped 登録され watermark が進むため、欠損が永久化する経路があった。**「失敗リソースは bootstrapped から除外（既登録なら剥がす）→ 次回フル pull で自動回復」に修正**（`createInitialSync.ts`。watermark は進めるため健全なリソースの delta 同期は維持）。regression テストを `createInitialSync.test.ts` / `createV2InitialSync.test.ts` に追加。

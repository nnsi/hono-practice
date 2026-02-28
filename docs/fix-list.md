# frontend-v2 vs mobile-v2 差分一覧

> 凡例: 🔧 今回修正 / ⏳ 別途対応 / ✅ 許容

---

## 1. 潜在バグ / 重大な差異

| # | 箇所 | 内容 | 方針 |
|---|------|------|------|
| **B1** | `mobile-v2/sync/rnPlatformAdapters.ts` `isOnline()` | **常に`true`を返す。** `NetInfo.fetch().then()`がローカル変数を非同期で更新するが、関数はその前に`true`を返してしまう。結果、オフライン時でもsyncを試みる | 🔧 修正 |
| **B2** | `mobile-v2/hooks/useAuth.ts` logout | **`clearToken()`を呼んでいない。** frontend-v2はlogout時にメモリ上のJWTをクリアするが、mobile-v2はDBのauth_stateだけ削除してトークンが残る | 🔧 修正 |
| **B3** | `mobile-v2/hooks/useActivityKinds.ts` | `activityId`未指定時、frontend-v2は空配列を返すが、mobile-v2は**全ActivityKindsを返す**（`getAllActivityKinds()`） | 🔧 Webに合わせる（空配列を返す） |

## 2. useTimer — 設計が根本的に異なる → 🔧 Webに合わせる

| 観点 | frontend-v2 | mobile-v2 |
|------|-------------|-----------|
| スコープ | Activity単位（`useTimer(activityId)`） | グローバルシングルトン（`useTimer()`） |
| 一時停止/再開 | 対応（stop→start で再開） | 非対応（stopで結果返却して終了） |
| 更新間隔 | 100ms | 1000ms |
| 永続化 | localStorage（per-activity key） | AsyncStorage（単一key） |
| activityName保存 | なし | あり |
| cancelTimer | なし | あり（結果を返さず破棄） |
| useLogForm内 | 外部hookをimport | **inline実装**（`useActivityTimer()`を同ファイル内に定義） |

## 3. useTasks — API設計が異なる → 🔧 Webに合わせる

| 観点 | frontend-v2 | mobile-v2 |
|------|-------------|-----------|
| Hook数 | 3つ（`useActiveTasks`, `useArchivedTasks`, `useTasksByDate`） | 1つ（`useTasks()`→ `{ activeTasks, archivedTasks }`） |
| 日付フィルタ | `useTasksByDate(date)` あり | **なし** |

## 4. taskRepository — タスク表示日付フィルタロジック → 🔧 Mobileの方が筋良い。Webをmobileに合わせる

| 観点 | frontend-v2 | mobile-v2 |
|------|-------------|-----------|
| `getTasksByDate` | **簡易フィルタ**: `deletedAt`, `archivedAt`, `startDate > date` のみチェック | `isTaskVisibleOnDate(t, date)` ドメイン述語を使用（`doneDate`, `dueDate`も考慮） |

frontend-v2側で `isTaskVisibleOnDate` ドメイン述語を使うように修正する。

## 5. syncActivityLogs — 処理順序の違い → 🔧 Webに合わせる

| frontend-v2 | mobile-v2 |
|-------------|-----------|
| `markSynced` → `upsertServerWins` → `markFailed` | `markSynced` → `markFailed` → `upsertServerWins` |

通常は問題ないが、IDが`skippedIds`と`serverWins`両方に含まれる場合に挙動が変わる可能性あり。

## 6. apiClient — アーキテクチャが大きく異なる → ⏳ Hono RPC Client移行として別途対応

| 観点 | frontend-v2 | mobile-v2 |
|------|-------------|-----------|
| API呼び出し | Hono RPC client（`hc<AppType>`）で型安全 | 手動fetch wrapper関数（型安全でない） |
| トークン管理 | `@packages/domain/sync/authenticatedFetch` に委譲 | 独自実装（inline 401リトライ） |
| リフレッシュトークン | cookie-based（`credentials: "include"`） | `expo-secure-store` / localStorage |
| login時 | `credentials: "include"` あり | なし（cookie非対応） |

## 7. activityRepository — トランザクションの有無 → 🔧 Webに合わせる

| 操作 | frontend-v2 | mobile-v2 |
|------|-------------|-----------|
| `completeActivityIconSync` | `db.transaction("rw", ...)` でアトミック | トランザクションなし（2つのSQL個別実行） |
| `clearActivityIcon` | `db.transaction` で3テーブルまとめて | 3つのSQL個別実行 |
| バッチupsert | `db.activities.bulkPut()` | `for...of` ループで個別INSERT |

mobile-v2でもSQLiteトランザクション（`BEGIN/COMMIT`）を使うようにする。

## 8. useActikoPage — 返却値の差異 → 🔧 Webに合わせる

frontend-v2のみにある返却値:
- `iconBlobMap`（アイコンblobのMap）
- `calendarOpen` / `setCalendarOpen`
- `setDate`

**確認済み**: mobile-v2はDBにアイコンデータがあるが**UIではemojiしか表示していない**。uploadedアイコン表示を実装する。

## 9. useDailyPage — 微細な差異 → 🔧 Webに合わせる

- frontend-v2: `calendarOpen`/`setCalendarOpen`あり、mobile-v2: なし
- frontend-v2: `kindsMap`に`DexieActivityKind`全体を格納、mobile-v2: `{ id, name, color }` のみ

**確認済み**: mobile-v2はprev/next矢印のみでCalendarPopoverがない。カレンダー選択UIを追加する。

## 10. useStatsPage — フィールド名の違い → ✅ 一旦許容

- frontend-v2: `log.activityId`, `log.activityKindId`（camelCase）
- mobile-v2: `log.activity_id`, `log.activity_kind_id`（snake_case・生SQLの結果直接参照）

DB層の違いに起因するため、Hono RPC Client移行やリポジトリ層統一時にまとめて対応。

## 11. useGoalsPage — activityMapの粒度 → 🔧 Webに合わせる

- frontend-v2: `Map<string, DexieActivity>`（全フィールド格納）
- mobile-v2: `Map<string, { id, name, emoji, quantityUnit }>`（4フィールドのみ）

mobile-v2もActivityRecord全体を格納するように修正。

## 12. useAuth — 初期化の違い → ✅ 許容

- mobile-v2は初期化時に`loadStorageCache()`を呼ぶ（AsyncStorageのキャッシュロード）
- frontend-v2はlocalStorageで同期アクセスのため不要

プラットフォーム差異のため許容。

## 13. hook名の不一致 → 🔧 Webに合わせる

| frontend-v2 | mobile-v2 |
|-------------|-----------|
| `useActivityLogsByDate(date)` | `useActivityLogs(date)` |

mobile-v2を `useActivityLogsByDate` にリネーム。

## 14. IconType値の違い → 🔧 Webに合わせる

- frontend-v2: `"emoji" | "upload"`
- mobile-v2: `"emoji" | "upload" | "generate"`（`"generate"`が追加）

mobile-v2の `"generate"` を削除し、Webと統一する。

---

## packages/domainを参照しているのにmobile-v2で未参照のもの → 🔧 全てdomain参照する

### `@packages/domain/` 系

| モジュール | frontend-v2での用途 | mobile-v2の状況 | 方針 |
|-----------|-------------------|---------------|------|
| `goal/goalStats` (`getInactiveDates`, `generateDailyRecords`, `calculateGoalStats`) | `GoalCard.tsx`, `GoalStatsDetail.tsx` でゴール統計計算 | 独自の`useGoalStats.ts`で直接SQLクエリ | 🔧 domain参照に変更 |
| `sync/tokenStorage` (`TokenStorage`) | `apiClient.ts` でトークン管理インターフェース | 独自のin-memory変数で管理 | ⏳ Hono RPC移行時 |
| `sync/authenticatedFetch` (`createAuthenticatedFetch`) | `apiClient.ts` で認証付きfetch生成 | 独自の`customFetch`をinline実装 | ⏳ Hono RPC移行時 |
| `activity/activityRepository` (`ActivityRepository`型) | `db/activityRepository.ts` で `satisfies` 制約 | 型制約なしで実装 | 🔧 `satisfies`追加 |
| `activityLog/activityLogRepository` (`ActivityLogRepository`型) | 同上 | 同上 | 🔧 `satisfies`追加 |
| `goal/goalRepository` (`GoalRepository`型) | 同上 | 同上 | 🔧 `satisfies`追加 |
| `task/taskRepository` (`TaskRepository`型) | 同上 | 同上 | 🔧 `satisfies`追加 |
| `sync/syncableRecord` (`Syncable`, `SyncStatus`型) | `db/schema.ts` でDexieスキーマ定義 | SQLiteでは直接`sync_status`カラム | 🔧 型参照追加 |
| `csv/csvParser` (`autoDetectMapping`, `ColumnMapping`型) | `useCSVImport.ts`, `CSVColumnMapper.tsx` で高度なCSVマッピング | 簡易版のCSVインポートのみ | 🔧 domain参照に変更 |

### `@packages/frontend-shared/` 系 → ⏳ 別途対応（実装が必要）

| モジュール | frontend-v2での用途 | mobile-v2の状況 |
|-----------|-------------------|---------------|
| `hooks/useApiKeys` | APIキー管理UI全体 | APIキー機能自体がない |
| `hooks/useSubscription` | サブスクリプション状態表示 | サブスクリプション機能自体がない |

### `@backend/` 系 → ⏳ Hono RPC Client移行時に対応

| モジュール | frontend-v2での用途 | mobile-v2の状況 |
|-----------|-------------------|---------------|
| `@backend/app` (`AppType`) | Hono RPCクライアントの型パラメータ | 手動fetch wrapperのため不要 |

### frontend-v2にのみ存在するローカルファイル → ⏳ ロジック共通化時に移動検討

| ファイル | 内容 |
|---------|------|
| `components/goal/GoalStatsDetail.tsx` | `@packages/domain/goal/goalStats`を使ったゴール詳細統計UI |
| `components/goal/activityHelpers.tsx` | `getActivityEmoji()`, `getActivityIcon()` UIヘルパー |
| `utils/imageResizer.ts` | Canvas APIでアイコン画像リサイズ（mobile-v2に相当機能なし） |
| `hooks/useCSVImport.ts` | 高度なCSVインポートワークフロー |
| `hooks/useCSVExport.ts` | CSVエクスポートワークフロー |
| `hooks/useApiKeys.ts` | APIキー管理hook |
| `hooks/useSubscription.ts` | サブスクリプション管理hook |
| `components/csv/CSVColumnMapper.tsx` | CSVカラムマッピングUI |
| `components/setting/ApiKeyManager.tsx` 等 | APIキー管理UI群 |

### mobile-v2にのみ存在するローカルファイル → 🔧 domain参照に変更

| ファイル | 内容 | 方針 |
|---------|------|------|
| `hooks/useGoalStats.ts` | 独自SQLベースのゴール統計計算 | `@packages/domain/goal/goalStats`を使うように書き換え |

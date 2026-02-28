# Actiko React Native版 移行計画

## 前提・決定事項

- **Expo Managed Workflow** + **Expo Router**
- **ローカルDB**: expo-sqlite (Expo SDK組込み)
- **同期**: 既存v2 sync APIをそのまま利用。ドメイン層のRepository抽象にexpo-sqlite実装を書くだけ
- **リアクティビティ**: EventEmitter + カスタム`useLiveQuery`フック（Dexie版と同等のDX）
- **スタイリング**: NativeWind (Tailwind for RN)
- **Google認証**: expo-auth-session (Custom Chrome Tabs / ASWebAuthenticationSession)
- **開発フロー**: Expo Go 使用可能（全依存がExpo SDK組込みまたはJS-only）。EAS Dev Buildは本番ビルドやネイティブモジュール追加時のみ
- 既存 `packages/domain`, `packages/types-v2` を共有
- **OTA更新**: EAS Updateで即時配信可能（ネイティブモジュール変更がないため制約なし）

---

## 1. コード流用性マトリクス

### そのまま流用 (変更不要)

| パッケージ/ファイル | 内容 |
|---|---|
| `packages/domain/goal/goalBalance.ts`, `goalStats.ts` | Goal計算ロジック |
| `packages/domain/task/taskGrouping.ts`, `taskSorters.ts` | Task分類・ソートロジック |
| `packages/domain/activity/activitySorters.ts` | Activity並び替えロジック |
| `packages/domain/activityLog/activityLogPredicates.ts` | ログ絞り込みロジック |
| `packages/domain/time/timeUtils.ts` | 時間計算ユーティリティ |
| `packages/domain/csv/` | CSV生成ロジック（データ部分） |
| `packages/domain/sync/tokenStorage.ts` | `TokenStorage` インターフェース |
| `packages/domain/sync/platformAdapters.ts` | `NetworkAdapter`, `StorageAdapter` インターフェース |
| `packages/domain/sync/syncableRecord.ts` | sync状態管理（expo-sqliteでも同じ仕組みを使う） |
| `packages/domain/sync/syncResult.ts` | syncレスポンス型 |
| `packages/domain/sync/apiMappers.ts` | API変換ロジック |
| `packages/domain/*/repository.ts` 型定義 | Repository抽象契約（sync系メソッド含む） |
| `packages/types-v2/` | Zodスキーマ（リクエスト/レスポンス型） |
| `packages/frontend-shared/` | `useApiKeys`, `useSubscription` (TanStack Query) |
| `apps/frontend-v2/src/components/stats/colorUtils.ts` | 色変換ユーティリティ |
| `apps/frontend-v2/src/components/stats/formatUtils.ts` | 数値フォーマット |
| 各ドメインの型定義ファイル (`types.ts`, `*Record.ts`) | 型定義 |

### アダプタ差し替えで流用

| 対象 | Web実装 | RN実装 |
|---|---|---|
| `authenticatedFetch.ts` | `credentials: "include"` (Cookie) | SecureStoreでrefresh token管理。Bearer ヘッダで送信 |
| `*/repository.ts` 具象実装 | Dexie API | expo-sqlite API |
| ページロジックフック (`use*Page.ts`) | `useLiveQuery` (dexie-react-hooks) | `useLiveQuery` (自前EventEmitter版) |
| `apps/frontend-v2/src/sync/` | Dexieリポジトリに依存 | expo-sqliteリポジトリに依存（ロジックは同一パターン） |

### 完全書き直し

| 対象 | 理由 |
|---|---|
| 全UIコンポーネント (30+) | `<div>` → `<View>`, Tailwind → NativeWind |
| ルーティング (`src/routes/`) | TanStack Router → Expo Router |
| `useCSVImport.ts` | FileReader → `expo-document-picker` + `expo-file-system` |
| `useCSVExport.ts` | Blob + `<a>.click()` → `expo-file-system` + `expo-sharing` |
| `imageResizer.ts` | Canvas API → `expo-image-manipulator` |
| `useTimer.ts` | localStorage → AsyncStorage |
| Google認証 | GIS script → `expo-auth-session` |

---

## 2. 同期設計

### 方針: 既存v2 sync APIをそのまま利用

WatermelonDB独自のsyncプロトコルは使わず、既存バックエンドのsync APIをそのまま利用する。

**→ バックエンドへの変更は不要。**

### 既存sync構造の再利用

```
packages/domain/
  sync/syncableRecord.ts   ← syncStatus / lastSyncedAt 管理（そのまま使う）
  sync/syncResult.ts       ← syncレスポンス型（そのまま使う）
  sync/apiMappers.ts       ← API変換（そのまま使う）
  */repository.ts          ← Repository型定義にsync系メソッドを含む（そのまま使う）

apps/frontend-v2/src/sync/
  syncEngine.ts            ← pull/push オーケストレーション（パターンを踏襲して再実装）
  syncActivityLogs.ts 等   ← テーブル別sync（パターンを踏襲して再実装）
```

RN版では:
1. `packages/domain/*/repository.ts` の型定義に合わせて expo-sqlite 具象Repositoryを実装（sync系メソッド含む）
2. sync engineは既存 `apps/frontend-v2/src/sync/` のロジックを参考に、expo-sqliteリポジトリを使うバージョンを実装
3. 既存バックエンドのsync APIをそのまま呼ぶ

### sync系Repositoryメソッドの実装イメージ

```typescript
// expo-sqlite版の具象Repository（例: taskRepository）
import type { TaskRepository } from "@actilog/domain/task/taskRepository";

export function newTaskRepository(db: SQLiteDatabase): TaskRepository {
  return {
    async createTask(input) {
      await db.runAsync(
        "INSERT INTO tasks (id, title, ..., sync_status) VALUES (?, ?, ..., 'pending')",
        [generateId(), input.title, ...]
      );
      dbEvents.emit("tasks");
    },

    async getPendingSyncTasks() {
      return db.getAllAsync(
        "SELECT * FROM tasks WHERE sync_status != 'synced' AND deleted_at IS NULL"
      );
    },

    async markTaskSynced(id, serverData) {
      await db.runAsync(
        "UPDATE tasks SET sync_status = 'synced', last_synced_at = ? WHERE id = ?",
        [Date.now(), id]
      );
      dbEvents.emit("tasks");
    },

    // ... 他メソッドも同様
  };
}
```

---

## 3. リアクティビティ層

### 設計: EventEmitter + カスタム useLiveQuery

Dexieの`useLiveQuery`に相当するリアクティブ購読を、シンプルなPub/Subで実現する。

#### dbEvents (イベントバス)

```typescript
// src/db/dbEvents.ts
const listeners = new Map<string, Set<() => void>>();

export const dbEvents = {
  emit(table: string) {
    listeners.get(table)?.forEach((fn) => fn());
  },
  subscribe(tables: string | string[], fn: () => void) {
    const tableList = Array.isArray(tables) ? tables : [tables];
    for (const table of tableList) {
      if (!listeners.has(table)) listeners.set(table, new Set());
      listeners.get(table)!.add(fn);
    }
    return () => {
      for (const table of tableList) {
        listeners.get(table)?.delete(fn);
      }
    };
  },
};
```

#### useLiveQuery (カスタムhook)

```typescript
// src/db/useLiveQuery.ts
export function useLiveQuery<T>(
  tables: string | string[],
  query: () => Promise<T>,
  deps: unknown[] = [],
): T | undefined {
  const [data, setData] = useState<T>();

  useEffect(() => {
    query().then(setData);
    return dbEvents.subscribe(tables, () => {
      query().then(setData);
    });
  }, [tables, ...deps]);

  return data;
}
```

#### feature hookでの使用例

```typescript
// Dexie版 (現在)
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/schema";

export function useActivities() {
  const activities = useLiveQuery(() =>
    db.activities.orderBy("orderIndex").filter((a) => !a.deletedAt).toArray()
  );
  return { activities: activities ?? [] };
}

// expo-sqlite版 (RN) — ほぼ同じAPI
import { useLiveQuery } from "../db/useLiveQuery";
import { db } from "../db/database";

export function useActivities() {
  const activities = useLiveQuery("activities", () =>
    db.getAllAsync<Activity>(
      "SELECT * FROM activities WHERE deleted_at IS NULL ORDER BY order_index"
    )
  );
  return { activities: activities ?? [] };
}
```

#### 複数テーブル依存の例

```typescript
export function useGoalWithLogs(goalId: string) {
  return useLiveQuery(["goals", "activity_logs"], async () => {
    const goal = await db.getFirstAsync<Goal>(
      "SELECT * FROM goals WHERE id = ?", [goalId]
    );
    const logs = await db.getAllAsync<ActivityLog>(
      "SELECT * FROM activity_logs WHERE activity_id = ?", [goal?.activityId]
    );
    return { goal, logs };
  }, [goalId]);
}
```

#### emit の呼び出し箇所

Repository具象実装の各writeメソッド末尾で `dbEvents.emit(tableName)` を呼ぶだけ。Repositoryが書き込みの唯一の経路なので、漏れなく通知される。

---

## 4. 認証フロー

### 既存実装で対応済み

調査の結果、バックエンドの `/auth/token` は**既にモバイル対応済み**:

- `authRoute.ts:106-111`: Cookieがなければ `Authorization: Bearer {refreshToken}` ヘッダから取得
- `authRoute.ts:99`: ログインレスポンスに `refreshToken` をbodyで返却済み
- `authRoute.ts:148`: トークンリフレッシュレスポンスにも `refreshToken` をbodyで返却済み

**→ 新規エンドポイントの追加は不要。**

### RN側の実装

```typescript
// RN版 authenticatedFetch
// - ログイン時: POST /auth/login → { token, refreshToken } を受け取る
//   - token → メモリ保持
//   - refreshToken → expo-secure-store に保存
// - トークンリフレッシュ時: POST /auth/token (Authorization: Bearer {refreshToken})
//   - 新しい token, refreshToken を受け取り、それぞれ更新
```

`authenticatedFetch.ts` の拡張:

```typescript
type AuthenticatedFetchOptions = {
  tokenStorage: TokenStorage;
  apiUrl: string;
  refreshStrategy: "cookie" | "bearer";  // cookie=Web, bearer=RN
  refreshTokenStorage?: {
    getRefreshToken(): Promise<string | null>;
    setRefreshToken(token: string): Promise<void>;
    clearRefreshToken(): Promise<void>;
  };
};
```

---

## 5. expo-sqlite スキーマ設計

### マイグレーション (初期スキーマ)

```typescript
// src/db/migrations.ts
import type { SQLiteDatabase } from "expo-sqlite";

export async function migrateDb(db: SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      label TEXT NOT NULL DEFAULT '',
      emoji TEXT NOT NULL DEFAULT '',
      icon_type TEXT NOT NULL DEFAULT 'emoji',
      icon_url TEXT,
      icon_thumbnail_url TEXT,
      description TEXT NOT NULL DEFAULT '',
      quantity_unit TEXT NOT NULL DEFAULT '',
      order_index TEXT NOT NULL DEFAULT '',
      show_combined_stats INTEGER NOT NULL DEFAULT 0,
      sync_status TEXT NOT NULL DEFAULT 'synced',
      last_synced_at INTEGER,
      deleted_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activity_kinds (
      id TEXT PRIMARY KEY,
      activity_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT,
      order_index TEXT NOT NULL DEFAULT '',
      sync_status TEXT NOT NULL DEFAULT 'synced',
      last_synced_at INTEGER,
      deleted_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_activity_kinds_activity_id ON activity_kinds(activity_id);

    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      activity_id TEXT NOT NULL,
      activity_kind_id TEXT,
      quantity REAL,
      memo TEXT NOT NULL DEFAULT '',
      date TEXT NOT NULL,
      time TEXT,
      sync_status TEXT NOT NULL DEFAULT 'synced',
      last_synced_at INTEGER,
      deleted_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_activity_logs_activity_id ON activity_logs(activity_id);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_date ON activity_logs(date);

    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      activity_id TEXT NOT NULL,
      daily_target_quantity REAL NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      description TEXT NOT NULL DEFAULT '',
      sync_status TEXT NOT NULL DEFAULT 'synced',
      last_synced_at INTEGER,
      deleted_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_goals_activity_id ON goals(activity_id);

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      start_date TEXT,
      due_date TEXT,
      done_date TEXT,
      memo TEXT NOT NULL DEFAULT '',
      archived_at INTEGER,
      sync_status TEXT NOT NULL DEFAULT 'synced',
      last_synced_at INTEGER,
      deleted_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_start_date ON tasks(start_date);
    CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
  `);
}
```

### スキーマ設計の注意点

- **`sync_status` / `last_synced_at` を含める**: 既存ドメイン層の `syncableRecord.ts` と同じ仕組みを使い、Repositoryのsync系メソッドで管理。WatermelonDBのように自動管理されないため明示的にカラムとして定義
- **`deleted_at` を含める**: soft delete。既存のDexieスキーマと同じ方式
- **`user_id` はスキーマに含めない**: 認証済みユーザーのデータのみ同期するため不要
- **Goal の `currentBalance`/`totalTarget`/`totalActual`**: サーバー側で計算される派生値のため含めない。`packages/domain/goal/goalBalance.ts` を使いローカルの activityLogs から算出
- **tasks の `start_date`/`due_date` にインデックス**: 日付フィルタクエリで必要

### DB初期化

```typescript
// src/db/database.ts
import * as SQLite from "expo-sqlite";
import { migrateDb } from "./migrations";

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync("actiko.db");
  await _db.execAsync("PRAGMA journal_mode = WAL;");
  await migrateDb(_db);
  return _db;
}
```

---

## 6. Expo Routerのルート構造

```
apps/mobile/
  app/
    _layout.tsx              ← Root layout (認証チェック, sync初期化)
    (auth)/
      _layout.tsx            ← 未認証時のレイアウト
      login.tsx              ← ID/PASS + Google Sign-In
      create-user.tsx
    (tabs)/
      _layout.tsx            ← タブナビゲーション
      index.tsx              ← Actiko (メイン記録画面)
      daily.tsx              ← Daily log
      goals.tsx              ← Goals
      stats.tsx              ← Statistics
      tasks.tsx              ← Tasks
      settings.tsx           ← Settings
```

---

## 7. UIスタック

| 観点 | 選定 | 理由 |
|---|---|---|
| スタイリング | NativeWind | Web版のTailwindクラスを参考にできる |
| アイコン | `lucide-react-native` | Web版と同一アイコンセット |
| チャート | `victory-native` | Rechartsの代替、SVG描画 |
| モーダル | RN Modal or Bottom Sheet | |
| Emoji Picker | `rn-emoji-keyboard` | @emoji-mart は非対応 |
| 日付選択 | `@react-native-community/datetimepicker` | |
| 画像リサイズ | `expo-image-manipulator` | |
| ファイル操作 | `expo-file-system` + `expo-sharing` | CSV import/export |
| セキュアストレージ | `expo-secure-store` | refresh token |
| ネットワーク検知 | `@react-native-community/netinfo` | |
| KVストレージ | `@react-native-async-storage/async-storage` | localStorage代替。Expo Go対応 |

**注**: `react-native-mmkv` はネイティブモジュールのためExpo Go非対応。AsyncStorageはExpo SDK組込みで、タイマー状態等の用途には十分。

---

## 8. 実装フェーズ

### Phase 0: 基盤準備

- [ ] `apps/mobile/` Expo + Expo Router プロジェクト作成
- [ ] pnpm workspace に `apps/mobile` を追加、`packages/domain` の import path 設定確認
- [ ] NativeWind セットアップ
- [ ] expo-sqlite 初期化 + マイグレーション実装
- [ ] `dbEvents` + `useLiveQuery` カスタムhook 実装
- [ ] `authenticatedFetch` を `refreshStrategy: "bearer"` 対応に拡張
- [ ] Expo Go で起動確認

### Phase 1: データ層 + 同期

- [ ] expo-sqlite Repository具象実装 (5テーブル × CRUD + sync系メソッド)
- [ ] sync engine 実装（既存 `apps/frontend-v2/src/sync/` のパターンを踏襲）
- [ ] 自動sync (フォアグラウンド時、30秒間隔 + オンライン復帰時)
- [ ] RNプラットフォームアダプタ (NetInfo, AsyncStorage)
- [ ] sync の結合テスト（Expo Goで pull/push 動作確認）

### Phase 2: 認証 + コア画面

- [ ] ログイン画面 (ID/PASS)
- [ ] 認証状態管理 (`useAuth` RN版、SecureStore)
- [ ] Actiko画面 (メイン記録) — 最重要画面を最初に
- [ ] Daily画面 (日別ログ一覧)
- [ ] RecordDialog (記録ダイアログ)

### Phase 3: 残り画面

- [ ] Goals画面 (goalBalance.ts を使いローカルで派生値計算)
- [ ] Stats画面 (victory-nativeでチャート)
- [ ] Tasks画面
- [ ] Settings画面

### Phase 4: 機能補完

- [ ] Google認証 (expo-auth-session)
- [ ] CSV Import/Export
- [ ] 画像アップロード + リサイズ
- [ ] タイマー機能

### Phase 5: 品質・リリース

- [ ] E2Eテスト (Maestro推奨)
- [ ] オフライン動作テスト
- [ ] パフォーマンスチューニング
- [ ] EAS Dev Build セットアップ（本番ビルド用）
- [ ] App Store / Google Play ビルド設定 (EAS Build)

---

## 9. モノレポ構成 (変更後)

```
actiko/
├── apps/
│   ├── backend/                 ← 変更なし
│   ├── frontend-v2/             ← 変更なし
│   ├── mobile/                  ← 新規 Expo app
│   │   ├── app/                 ← Expo Router ページ
│   │   ├── src/
│   │   │   ├── db/              ← expo-sqlite schema + migrations + dbEvents + useLiveQuery
│   │   │   ├── repositories/    ← expo-sqlite Repository具象実装
│   │   │   ├── hooks/           ← RN用カスタムフック
│   │   │   ├── components/      ← RN UIコンポーネント
│   │   │   ├── sync/            ← sync engine (既存パターン踏襲)
│   │   │   └── utils/           ← apiClient (RN版、authenticatedFetch)
│   │   ├── app.json
│   │   └── package.json
│   └── tail-worker/
├── packages/
│   ├── domain/                  ← 変更なし（Repository型+sync系メソッドをそのまま利用）
│   ├── types-v2/                ← 変更なし
│   └── frontend-shared/         ← 変更なし, RNからも利用
└── pnpm-workspace.yaml          ← mobile追加
```

**注**: バックエンドへの変更は不要。既存v2 sync APIをそのまま使うため、新規エンドポイントの追加もない。

---

## 10. リスク・注意事項

| リスク | 影響 | 対策 |
|---|---|---|
| expo-sqliteにリアクティブ購読がない | UIの自動更新がDexie版より遅延する可能性 | EventEmitter + useLiveQuery で即座にemit。Repository writeメソッドが唯一の書き込み経路なので漏れなし |
| sync engineの再実装コスト | 既存frontend-v2のsync engineをRN用に書き直す必要 | ロジックは同一パターン。Repository抽象に依存する形で書けば差分は少ない |
| expo-sqliteのパフォーマンス | 大量レコード時のクエリ速度 | WALモード有効化。インデックス設計済み。個人アプリなのでレコード数は限定的 |
| AsyncStorageの同期API不在 | MMKVと違い非同期APIのみ | タイマー状態等の用途では非同期で問題なし |
| Hono Client (`hc()`) がRNで動くか | fetch依存で基本動くが未検証 | 動かない場合はプレーンfetchに置換 |
| useLiveQueryのメモリリーク | subscribe解除漏れ | useEffectのcleanupで確実にunsubscribe。テストで検証 |

---

## 11. expo-sqlite採用のメリットまとめ

| 観点 | WatermelonDB (旧計画) | expo-sqlite (新計画) |
|---|---|---|
| **Expo Go** | NG（Dev Build必須） | OK |
| **OTA更新** | 制約あり（ネイティブモジュール変更時NG） | 制約なし |
| **バックエンド変更** | 必要（/sync/pull, /sync/push 新設） | 不要（既存API流用） |
| **sync実装** | WatermelonDB built-in | 既存v2パターン踏襲（自前実装） |
| **リアクティビティ** | observe() 組込み | EventEmitter自前実装（~50行） |
| **ネイティブ設定** | CocoaPods/Android linking必要 | 不要 |
| **学習コスト** | WatermelonDB Model/Schema/Decorator | 標準SQL |
| **将来のWeb統一** | LokiJSAdapterで共通化可能 | Repository抽象で共通化済み |

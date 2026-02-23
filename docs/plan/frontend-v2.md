# Frontend V2 計画: オフラインファースト Actiko

## 方針

フロントエンドにロジックを集約し、バックエンドはデータ保存に徹するオフラインファースト設計。
ネットワーク待ちゼロで即座に記録 → バックグラウンド同期で「最速記録」を実現する。

## 技術選定

| 項目 | 選定 |
|------|------|
| フレームワーク | React + Vite + TanStack Router（既存と同構成） |
| オフラインDB | Dexie.js (IndexedDB) |
| PWA | vite-plugin-pwa |
| ID生成 | UUID v7（クライアント生成） |
| 同期戦略 | クライアント生成 + サーバー受け入れ（Last-write-wins） |
| UIライブラリ | Tailwind CSS + Radix UI（既存と同構成） |
| バリデーション | Zod |
| 状態管理 | Dexie liveQuery（ローカルデータ）|

## アーキテクチャ概要

```
[ユーザー操作]
    ↓
[React UI] ←→ [Dexie.js (IndexedDB)]
                    ↓ (オンライン時)
               [同期エンジン]
                    ↓
               [Backend API /users/v2/*]
                    ↓
               [Neon Postgres]
```

### データフロー

1. ユーザーが記録 → Dexieに即保存（UIは即座に反映、`_syncStatus: "pending"`）
2. 同期エンジンが pending レコードを検知 → バッチ送信
3. サーバーは `ON CONFLICT DO UPDATE ... WHERE` で LWW upsert
4. レスポンスに `syncedIds`（成功）、`serverWins`（サーバー勝利）、`skippedIds`（不正データ）を返却
5. クライアント: `syncedIds` → synced にマーク、`serverWins` → Dexie 上書き、`skippedIds` → failed にマーク
6. 未応答のレコードは pending のまま残り、次回同期で再送

## パッケージ構成

```
packages/
  domain/                    # 新規: 同期用フラット型 + バリデーション
    models/
      activity.ts            # Activity, ActivityKind 型定義
      activityLog.ts         # ActivityLog 型定義
    validation/
      activityLog.ts         # Zodスキーマ（ビジネスルール）
    index.ts

  types-v2/                  # 新規: API Request/Response型（システム都合の型）
    request/
      activityLog.ts
    response/
      activityLog.ts
    index.ts

  types/                     # 既存: v1用（変更なし）

apps/
  frontend-v2/               # 新規: オフラインファーストSPA
    src/
      db/                    # Dexie定義
      sync/                  # 同期エンジン
      hooks/                 # React hooks
      components/            # UIコンポーネント
      routes/                # TanStack Routerページ
      providers/             # Context providers
      utils/

  backend/
    feature-v2/              # 新規: v2 CRUD（Drizzle直書き）
      activityLog.ts
      activity.ts

  mobile/                    # 削除
```

### packages/domain と apps/backend/domain の関係

- `packages/domain`: フロントエンド + API通信用の **フラットな型定義**。Branded Type なし、discriminated union なし
- `apps/backend/domain`: バックエンド固有の **リッチなドメインモデル**（Branded Type + `new`/`persisted` 判別 + ファクトリ関数）。既存のまま残す
- 両者は共存する。`packages/domain` は「同期プロトコルの型」、`apps/backend/domain` は「バックエンド内部のビジネスロジック型」として棲み分ける
- 将来的にバックエンドのドメインモデルを `packages/domain` に統合する余地は残すが、MVP では行わない

### packages/types-v2 と packages/types の関係

- `packages/types`: v1 API 用（既存フロントエンドが使用）。変更なし
- `packages/types-v2`: v2 API 用（frontend-v2 が使用）。同期エンドポイントのリクエスト/レスポンス型
- 認証系 API（`/auth/login`, `/auth/token` 等）は v1/v2 共通。認証系の型は `packages/types` から import して使う

---

## フェーズ 1a: クリーンアップ

### 1a-1. React Native (mobile) 削除

- `apps/mobile/` ディレクトリを削除
- `packages/frontend-shared/adapters/react-native.ts` は残す（将来のため）
- ルート `package.json` から `"mobile-dev"` スクリプトを削除
- ルート `tsconfig.json` から `"extends": "expo/tsconfig.base"` を削除（mobile 由来）
- tsconfig の参照からも除外
- **検証:** `npm run test-once` + `npm run tsc` 通過確認

### 1a-2. npm → pnpm 移行

mobile 削除直後、新パッケージ追加前に実施する。

**作業手順:**
1. `package-lock.json` 削除
2. `node_modules` 全削除（ルート + 各 workspace）
3. `pnpm-workspace.yaml` 作成
4. ルート `package.json` から `"workspaces"` フィールドを削除（pnpmでは `pnpm-workspace.yaml` で管理）
5. ルート `package.json` に `"packageManager": "pnpm@10.x.x"` を追加（Corepack 連携用）
6. `corepack enable pnpm` を実行
7. `pnpm install` で `pnpm-lock.yaml` 生成
8. ルート `package.json` の scripts を pnpm 形式に書き換え:
   - `npm run xxx -w yyy` → `pnpm --filter yyy xxx`
   - `npx wrangler` → `pnpm exec wrangler`
9. `lefthook.yml` 内の `npx` を `pnpm exec` に書き換え:
   ```yaml
   # before: npx biome lint / npx vitest run
   # after:  pnpm exec biome lint / pnpm exec vitest run
   ```
10. `.github/workflows/deploy.yml` を更新:
    - `pnpm/action-setup` アクション追加
    - `npm ci` → `pnpm install --frozen-lockfile`
    - `npm run xxx` → `pnpm run xxx`
    - `npx wrangler` → `pnpm exec wrangler`
    - CI キャッシュを `pnpm store path` ベースに変更
11. **検証:** `pnpm run test-once` + `pnpm run tsc` で既存が壊れていないことを確認

**pnpm-workspace.yaml:**
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**リスク:**
- 幽霊依存（各 workspace の package.json に明示されていないが使えていた依存）が壊れる可能性
- 発覚したら各 workspace の package.json に不足分を追加する
- pnpm の strict な依存解決で `shamefully-hoist=true` が必要になる場合は `.npmrc` に追加

---

## フェーズ 1b: 新パッケージ + スキャフォールド

### 1b-1. packages/domain 作成

同期プロトコル用のフラットな型定義。既存の Postgres スキーマと完全に整合させる。

```typescript
// packages/domain/models/activity.ts
export type Activity = {
  id: string           // UUID
  userId: string
  name: string
  label: string
  emoji: string
  iconType: "emoji" | "upload" | "generate"
  iconUrl: string | null
  iconThumbnailUrl: string | null
  description: string
  quantityUnit: string
  orderIndex: string   // ※ Postgres では text 型（辞書順ソート用）
  showCombinedStats: boolean
  createdAt: string    // ISO 8601
  updatedAt: string
  deletedAt: string | null
}

export type ActivityKind = {
  id: string
  activityId: string
  name: string
  color: string | null
  orderIndex: string   // ※ text 型
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

// packages/domain/models/activityLog.ts
export type ActivityLog = {
  id: string           // UUID v7
  userId: string
  activityId: string
  activityKindId: string | null
  quantity: number | null  // ※ Postgres では nullable
  memo: string
  date: string         // YYYY-MM-DD
  time: string | null  // HH:MM:SS（DB カラム名: done_hour）
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}
```

バリデーション:

```typescript
// packages/domain/validation/activityLog.ts
import { z } from "zod"

export const ActivityLogSchema = z.object({
  quantity: z.number().min(0).nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  memo: z.string().default(""),
})
```

### 1b-2. packages/types-v2 作成

```typescript
// packages/types-v2/request/activityLog.ts
import { z } from "zod"

export const UpsertActivityLogRequestSchema = z.object({
  id: z.string().uuid(),
  activityId: z.string().uuid(),
  activityKindId: z.string().uuid().nullable(),
  quantity: z.number().min(0).nullable(),
  memo: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),         // 形式制約追加
  time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable(), // HH:MM or HH:MM:SS
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
})

// バッチ同期用（上限100件）
export const SyncActivityLogsRequestSchema = z.object({
  logs: z.array(UpsertActivityLogRequestSchema).max(100),
})

export type UpsertActivityLogRequest = z.infer<typeof UpsertActivityLogRequestSchema>
export type SyncActivityLogsRequest = z.infer<typeof SyncActivityLogsRequestSchema>
```

```typescript
// packages/types-v2/response/activityLog.ts
import type { ActivityLog } from "@packages/domain"

// レスポンス型（Zodスキーマとtype定義を一致させる）
export type SyncActivityLogsResponse = {
  syncedIds: string[]       // 同期成功したログID
  serverWins: ActivityLog[] // サーバー勝利レコード（全フィールド）
  skippedIds: string[]      // バリデーション失敗でスキップされたログID
}
```

### 1b-3. apps/frontend-v2 スキャフォールディング

```bash
# 最小構成で作成
apps/frontend-v2/
  package.json               # React, Vite, TanStack Router, Dexie, vite-plugin-pwa
  vite.config.ts             # PWA設定込み
  tsconfig.json
  index.html
  src/
    main.tsx                 # エントリポイント
    App.tsx                  # ルーター設定
    routes/
      __root.tsx             # ルートレイアウト
      index.tsx              # ホーム（→ /actiko にリダイレクト）
      actiko.tsx             # メイン記録画面
    db/
      schema.ts              # Dexieテーブル定義
      index.ts               # DB初期化
    sync/
      syncEngine.ts          # 同期エンジン
    providers/
      AppProviders.tsx
    hooks/
    components/
    utils/
```

**vite-plugin-pwa 設定:**
```typescript
// vite.config.ts
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        navigateFallback: "/index.html",
        navigateFallbackAllowlist: [/^(?!\/(api|auth|users|r2|batch))/],
        runtimeCaching: [
          {
            // API リクエストはキャッシュしない（同期エンジンが管理）
            urlPattern: /\/(users|auth|api)\/.*/,
            handler: "NetworkOnly",
          },
        ],
      },
      manifest: {
        name: "Actiko",
        short_name: "Actiko",
        start_url: "/",
        scope: "/",
        theme_color: "#000000",
        background_color: "#000000",
        display: "standalone",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
    TanStackRouterVite(),
  ],
})
```

**PWA 運用方針:**
- `registerType: "autoUpdate"` でバックグラウンド自動更新。MVP後に更新通知トーストの追加を検討
- オフライン時は Service Worker がキャッシュ済み静的アセットを返し、データは Dexie から読み取る
- API パスは全て `NetworkOnly`（Service Worker はデータキャッシュに関与しない）

---

## フェーズ 2: オフラインデータ層

### 2-1. Dexie テーブル定義

Postgres スキーマと完全に整合させる。timestamp 系フィールドは ISO 8601 文字列で統一。

```typescript
// apps/frontend-v2/src/db/schema.ts
import Dexie, { type Table } from "dexie"

export type DexieActivityLog = {
  id: string               // UUID v7（クライアント生成）
  activityId: string
  activityKindId: string | null
  quantity: number | null   // ※ nullable に合わせる
  memo: string
  date: string             // YYYY-MM-DD
  time: string | null
  createdAt: string        // ISO 8601
  updatedAt: string
  deletedAt: string | null
  _syncStatus: "synced" | "pending" | "failed"
}

export type DexieActivity = {
  id: string
  userId: string
  name: string
  label: string
  emoji: string
  iconType: "emoji" | "upload" | "generate"
  iconUrl: string | null
  iconThumbnailUrl: string | null
  description: string
  quantityUnit: string
  orderIndex: string       // ※ text 型に合わせる
  showCombinedStats: boolean
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export type DexieActivityKind = {
  id: string
  activityId: string
  name: string
  color: string | null
  orderIndex: string       // ※ text 型に合わせる
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export type DexieAuthState = {
  id: "current"            // 固定キー（1レコードのみ）
  userId: string
  lastLoginAt: string      // ISO 8601
}

export class ActikoDatabase extends Dexie {
  activityLogs!: Table<DexieActivityLog, string>
  activities!: Table<DexieActivity, string>
  activityKinds!: Table<DexieActivityKind, string>
  authState!: Table<DexieAuthState, string>

  constructor() {
    super("actiko")
    this.version(1).stores({
      activityLogs: "id, activityId, date, _syncStatus, [date+activityId]",
      activities: "id, orderIndex",
      activityKinds: "id, activityId",
      authState: "id",
    })
  }
}

export const db = new ActikoDatabase()
```

**Dexie バージョンマイグレーション方針:**
将来スキーマ変更が必要な場合は `this.version(2).stores({...}).upgrade(tx => {...})` で対応。
計画段階では version 1 で開始し、必要になったら upgrade 関数を追加する。

**ストレージ永続化:**
PWA インストール後に `navigator.storage.persist()` を呼び出し、ブラウザによるデータ自動削除を防止する。
長期運用時は synced 済みの古いデータ（90日超）をパージする戦略を検討する（MVP後）。

### 2-2. ローカルCRUD操作

```typescript
// apps/frontend-v2/src/db/activityLogRepository.ts
import { v7 as uuidv7 } from "uuid"
import { db, type DexieActivityLog } from "./schema"

type CreateInput = Pick<DexieActivityLog, "activityId" | "activityKindId" | "quantity" | "memo" | "date" | "time">

export const activityLogRepository = {
  async create(input: CreateInput) {
    const now = new Date().toISOString()
    const log: DexieActivityLog = {
      ...input,
      id: uuidv7(),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      _syncStatus: "pending",
    }
    await db.activityLogs.add(log)
    return log
  },

  async getByDate(date: string) {
    return db.activityLogs
      .where("date").equals(date)
      .filter(log => log.deletedAt === null)
      .toArray()
  },

  async update(id: string, changes: Partial<Pick<DexieActivityLog, "quantity" | "memo" | "activityKindId" | "date" | "time">>) {
    const now = new Date().toISOString()
    await db.activityLogs.update(id, {
      ...changes,
      updatedAt: now,
      _syncStatus: "pending",
    })
  },

  async softDelete(id: string) {
    const now = new Date().toISOString()
    await db.activityLogs.update(id, {
      deletedAt: now,
      updatedAt: now,
      _syncStatus: "pending",
    })
  },

  async getPendingSync() {
    return db.activityLogs.where("_syncStatus").equals("pending").toArray()
  },

  async markSynced(ids: string[]) {
    if (ids.length === 0) return
    await db.activityLogs
      .where("id").anyOf(ids)
      .modify({ _syncStatus: "synced" })
  },

  async markFailed(ids: string[]) {
    if (ids.length === 0) return
    await db.activityLogs
      .where("id").anyOf(ids)
      .modify({ _syncStatus: "failed" })
  },

  async upsertFromServer(logs: Omit<DexieActivityLog, "_syncStatus">[]) {
    await db.activityLogs.bulkPut(
      logs.map(log => ({ ...log, _syncStatus: "synced" as const }))
    )
  },
}
```

---

## フェーズ 3: バックエンド v2 エンドポイント

> ※ 同期エンジン（フェーズ4）より先にバックエンドを用意する。
> 同期エンジンはAPIが存在しないと動作確認できないため。

### 3-1. 同期エンドポイント

```typescript
// apps/backend/feature-v2/activityLog.ts
import { Hono } from "hono"
import { and, eq, gt, inArray, isNull, lt } from "drizzle-orm"

const app = new Hono()

// バッチ同期（upsert）
app.post("/activity-logs/sync", async (c) => {
  const { logs } = SyncActivityLogsRequestSchema.parse(await c.req.json())
  const userId = c.get("userId")

  // ---- activityId 所有者チェック（一括） ----
  const requestedActivityIds = [...new Set(logs.map(l => l.activityId))]
  const ownedActivities = await db.select({ id: activities.id })
    .from(activities)
    .where(and(
      inArray(activities.id, requestedActivityIds),
      eq(activities.userId, userId),
    ))
  const ownedActivityIdSet = new Set(ownedActivities.map(a => a.id))

  const syncedIds: string[] = []
  const serverWins: ActivityLog[] = []
  const skippedIds: string[] = []
  const maxAllowed = new Date(Date.now() + 5 * 60 * 1000)

  for (const log of logs) {
    // バリデーション: activityId 所有チェック + updatedAt 未来制限
    if (!ownedActivityIdSet.has(log.activityId) || new Date(log.updatedAt) > maxAllowed) {
      skippedIds.push(log.id)
      continue
    }

    // ON CONFLICT DO UPDATE（LWW条件付き）
    // setWhere に userId ガードを追加: 万が一 ID 衝突しても他ユーザーのデータは更新しない
    const result = await db.insert(activityLogs)
      .values({ ...log, userId })
      .onConflictDoUpdate({
        target: activityLogs.id,
        set: {
          activityKindId: log.activityKindId,
          quantity: log.quantity,
          memo: log.memo,
          date: log.date,
          time: log.time,
          createdAt: log.createdAt,
          updatedAt: log.updatedAt,
          deletedAt: log.deletedAt,
        },
        // LWW: クライアントが新しい場合のみ更新 + userId ガード
        setWhere: and(
          lt(activityLogs.updatedAt, new Date(log.updatedAt)),
          eq(activityLogs.userId, userId),
        ),
      })
      .returning()

    if (result.length > 0) {
      // INSERT or UPDATE 成功
      syncedIds.push(log.id)
    } else {
      // サーバーが勝った or 他ユーザーの行 → サーバーの最新を返却
      const serverLog = await db.select().from(activityLogs)
        .where(and(eq(activityLogs.id, log.id), eq(activityLogs.userId, userId)))
        .limit(1)
      if (serverLog.length > 0) {
        serverWins.push(serverLog[0])
      } else {
        // 他ユーザーの行に衝突 → スキップ扱い
        skippedIds.push(log.id)
      }
    }
  }

  return c.json({ syncedIds, serverWins, skippedIds })
})

// データ取得（初回同期 / 差分取得用）
app.get("/activity-logs", async (c) => {
  const userId = c.get("userId")
  const since = c.req.query("since") // ISO datetime（差分取得用）

  const conditions = [eq(activityLogs.userId, userId)]
  if (since) {
    conditions.push(gt(activityLogs.updatedAt, new Date(since)))
  }

  const logs = await db.select().from(activityLogs).where(and(...conditions))
  return c.json({ logs })
})

// activities 取得（activityKinds 含む）
app.get("/activities", async (c) => {
  const userId = c.get("userId")
  const result = await db.select().from(activitiesTable)
    .where(and(eq(activitiesTable.userId, userId), isNull(activitiesTable.deletedAt)))
    .orderBy(activitiesTable.orderIndex)

  const activityIds = result.map(a => a.id)
  const kinds = activityIds.length > 0
    ? await db.select().from(activityKindsTable)
        .where(and(
          inArray(activityKindsTable.activityId, activityIds),
          isNull(activityKindsTable.deletedAt)
        ))
    : []

  return c.json({ activities: result, activityKinds: kinds })
})

export const featureV2Route = app
```

**実装時の注意:**
- `onConflictDoUpdate` + `setWhere` + `returning()` の実際の SQL 出力は実装時に `EXPLAIN` で確認すること
- PostgreSQL の `ON CONFLICT ... DO UPDATE ... WHERE <false>` は no-op（エラーにならない）

### 3-2. ルーティング登録 + CORS

```typescript
// apps/backend/app.ts に追加
app.route("/users/v2", featureV2Route)
// 既存の app.use("/users/*", authMiddleware) で認証カバー済み
```

CORS 設定は既存の `cors()` ミドルウェアで `APP_URL` 環境変数からオリジンを取得している。
frontend-v2 のデプロイ先（例: `v2.actiko.app`）を `APP_URL` のallowリストに追加する。
開発時はポートが異なる場合があるため、`ADDITIONAL_ORIGINS` 環境変数の追加を検討。

```typescript
// 既存の cors 設定例を拡張
cors({
  origin: [c.env.APP_URL, ...(c.env.ADDITIONAL_ORIGINS?.split(",") ?? [])],
  credentials: true,
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  maxAge: 86400, // preflight キャッシュ 24h
})
```

---

## フェーズ 4: 同期エンジン

### 4-1. 同期エンジン

```typescript
// apps/frontend-v2/src/sync/syncEngine.ts
import { activityLogRepository } from "../db/activityLogRepository"
import type { SyncActivityLogsResponse } from "@packages/types-v2"

let isSyncing = false  // 排他制御
let retryCount = 0
const MAX_RETRY = 5
const BASE_DELAY_MS = 1000

export const syncEngine = {
  async syncActivityLogs(apiClient: ApiClient): Promise<void> {
    if (isSyncing) return
    isSyncing = true

    try {
      const pending = await activityLogRepository.getPendingSync()
      if (pending.length === 0) return

      // _syncStatus はサーバーに送らない
      const logs = pending.map(({ _syncStatus, ...log }) => log)

      const res = await apiClient.post("/users/v2/activity-logs/sync", { logs })

      if (res.ok) {
        const data: SyncActivityLogsResponse = await res.json()

        // syncedIds → synced にマーク
        await activityLogRepository.markSynced(data.syncedIds)

        // serverWins → Dexie を上書き
        if (data.serverWins.length > 0) {
          await activityLogRepository.upsertFromServer(data.serverWins)
        }

        // skippedIds → failed にマーク（不正データ）
        await activityLogRepository.markFailed(data.skippedIds)

        retryCount = 0 // 成功したらリセット
      } else if (res.status === 401) {
        // JWT 期限切れ → apiClient のインターセプターでリフレッシュ or ログイン画面
      } else {
        // 5xx等 → リトライカウント増加（pending のまま残る）
        retryCount++
      }
    } catch {
      // ネットワークエラー等 → pending のまま残る
      retryCount++
    } finally {
      isSyncing = false
    }
  },

  startAutoSync(apiClient: ApiClient, intervalMs = 30000) {
    const sync = () => syncEngine.syncActivityLogs(apiClient)

    // オンライン復帰時に即同期
    window.addEventListener("online", sync)

    // 定期同期（指数バックオフ付き）
    let timeoutId: ReturnType<typeof setTimeout>
    const scheduleNext = () => {
      const delay = retryCount > 0
        ? Math.min(BASE_DELAY_MS * 2 ** retryCount, 5 * 60 * 1000) // 最大5分
        : intervalMs
      timeoutId = setTimeout(async () => {
        if (navigator.onLine) await sync()
        scheduleNext()
      }, delay)
    }
    scheduleNext()

    return () => {
      window.removeEventListener("online", sync)
      clearTimeout(timeoutId)
    }
  },
}
```

### 4-2. 初回ログイン時のデータ取得

```
ログイン成功
  → Dexie の authState を更新（userId, lastLoginAt）
  → サーバーから全 activities + activityKinds を取得（GET /users/v2/activities）
  → Dexie に保存
  → 直近30日分の activityLogs を取得（GET /users/v2/activity-logs）
  → Dexie に保存（_syncStatus: "synced"）
  → lastSyncedAt を localStorage に保存（差分取得の起点）
  → 以降はDexieから読み取り、差分同期は ?since=lastSyncedAt で実行
```

### 4-3. オフライン時の認証フロー

```
アプリ起動
  ├─ オンライン → 通常の JWT 認証フロー（/auth/token でリフレッシュ）
  └─ オフライン → Dexie の authState（最終ログイン時刻）を確認
                  ├─ 最終ログインが24時間以内 → Dexie のデータで操作可能
                  └─ 最終ログインが24時間超 → ログイン画面表示（オンライン復帰待ち）
```

### 4-4. LWW 同期ルール（明示）

- `updatedAt` が**クライアント > サーバー**の場合のみサーバーを更新（`lt` 条件）
- `updatedAt` が**同値**の場合はサーバー側を保持（no-op）。既に同一データが同期済みの正常ケース
- クライアントの時刻がずれている場合の影響:
  - 過去にずれている → クライアントの変更がサーバーに反映されない。次回オンライン同期時に serverWins で上書きされる
  - 未来にずれている → 5分制限で弾かれる。5分以内のずれは許容（単一ユーザーなので実害なし）
- UUID v7 もタイムスタンプを含むが、並び順はアプリ内でのみ使用しDB側のソートには依存しない

---

## フェーズ 5: UI構築（MVP）

### 5-1. MVP画面構成

```
/              → /actiko にリダイレクト
/actiko        → アクティビティ一覧 + ワンタップ記録
/login         → ログイン画面
```

※ `/daily`（日次ログ一覧・編集）はMVP後に追加。
※ activities の作成・編集は MVP では v1 フロントエンドを併用する。v2 は activities を読み取り専用として扱う。

### 5-2. Actiko記録画面

既存UIを参考にしつつ、Dexieからデータを取得:

```typescript
// hooks/useActivities.ts
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "../db/schema"

export function useActivities() {
  // useLiveQuery は初回 undefined を返すので ?? [] でガード（全 liveQuery で徹底する）
  const activities = useLiveQuery(
    () => db.activities.orderBy("orderIndex").filter(a => !a.deletedAt).toArray()
  )
  return { activities: activities ?? [] }
}

// hooks/useActivityLogCreate.ts
import { activityLogRepository } from "../db/activityLogRepository"

export function useActivityLogCreate() {
  const create = async (input: { activityId: string; quantity: number; date: string; memo?: string }) => {
    await activityLogRepository.create({
      activityId: input.activityId,
      activityKindId: null,
      quantity: input.quantity,
      memo: input.memo ?? "",
      date: input.date,
      time: null,
    })
    // Dexie liveQuery が自動でUI更新
    // 同期は syncEngine が非同期で処理
  }
  return { create }
}
```

### 5-3. Dexie liveQuery による自動UI更新

`dexie-react-hooks` の `useLiveQuery` を使用。
Dexieへの書き込みが即座にUIに反映される（サーバー応答を待たない）。

**注意点:**
- `useLiveQuery` は初回レンダリングで `undefined` を返す。全フックで `?? []` / `?? null` のガードを徹底する
- TanStack Query は使用しない（ローカルDBからの読み取りのみ）

---

## 同期における親子関係の順序制御

```
同期順序:
  1. activities（親）
  2. activityKinds（子）
  3. activityLogs（孫）

※ 外部キー制約のため、親が先にサーバーに存在する必要がある
※ MVP時点では activities の作成はサーバー側（v1）で行い、
   v2フロントは activities を読み取り専用として扱う
※ したがって MVP では activityLogs の同期のみ実装すればよい
```

---

## MVP 完了条件

1. `apps/frontend-v2` でログイン → サーバーからactivities取得 → Dexieに保存
2. アクティビティをタップ → 数量入力 → Dexieに即保存（UIに即反映）
3. オンライン時にバックグラウンドでサーバーに同期（syncedIds/serverWins/skippedIds を正しく処理）
4. ページリロードしてもDexieからデータ復元
5. オフライン状態でも記録可能 → オンライン復帰時に自動同期
6. PWAとしてインストール可能（standalone 表示）

## デプロイ戦略

- 既存の `apps/frontend` は Cloudflare Pages にデプロイされている
- `apps/frontend-v2` は別の Cloudflare Pages プロジェクトとしてデプロイ（v2.actiko.app 等）
- MVP検証後に既存フロントエンドと入れ替える判断をする
- デプロイ設定の詳細は実装フェーズで決定

## 作業順序まとめ

```
Phase 1a: クリーンアップ（既存コードの変更のみ、独立して検証可能）
  1a-1. apps/mobile 削除（+ tsconfig, scripts 整理）→ テスト通過確認
  1a-2. npm → pnpm 移行（+ lefthook, deploy.yml, packageManager, Corepack）→ テスト通過確認

Phase 1b: 新パッケージ + スキャフォールド
  1b-1. packages/domain 作成（Postgres スキーマと整合した型定義）
  1b-2. packages/types-v2 作成（同期 API の req/res 型、date/time 形式制約付き）
  1b-3. apps/frontend-v2 スキャフォールディング（PWA設定込み）

Phase 2: オフラインデータ層
  2-1. Dexie テーブル定義（Postgres と型整合、authState 含む）
  2-2. ローカルCRUD操作（markFailed 対応）

Phase 3: バックエンド v2 エンドポイント（※ 同期エンジンより先）
  3-1. /users/v2/activity-logs/sync
       - activityId 一括所有者チェック
       - ON CONFLICT upsert + setWhere に userId ガード
       - syncedIds / serverWins / skippedIds を返却
  3-2. /users/v2/activity-logs (GET, since パラメータ対応)
  3-3. /users/v2/activities (GET, activityKinds 含む)
  3-4. ルーティング登録 + CORS 設定（origin 許可リスト拡張）

Phase 4: 同期エンジン
  4-1. 同期エンジン実装（排他制御 + 3分類処理 + 指数バックオフ）
  4-2. 初回ログイン時データ取得 + lastSyncedAt 管理
  4-3. オフライン認証フロー
  4-4. LWW 同期ルール（同値=no-op、時刻ずれ対策）

Phase 5: UI構築（MVP）
  5-1. ログイン画面
  5-2. Actiko記録画面（useLiveQuery + Dexie）
  5-3. PWA インストール確認 + 動作検証
```

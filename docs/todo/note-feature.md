# Note機能 設計ドキュメント

## 概要

Markdownベースの個人ノート機能。PC⇔スマホでオフライン同期される。
Activityに紐づけることで「その活動のストック知識」として機能し、紐づけなければ汎用メモとして使える。

## purpose.mdとの整合性

Noteは活動記録のコアフロー（最速で記録）には干渉しない。
TaskがActivityに紐づく「やること」として存在するのと同様に、NoteはActivityに紐づく「ストック情報」として位置づける。紐づけは任意。

### 情報の性質による分離

| エンティティ | 紐づき先 | 情報の性質 |
|---|---|---|
| ActivityLog.memo | ActivityLog（1回の記録） | フロー — その瞬間の記録 |
| Note | Activity（任意）or 独立 | ストック — 蓄積される知識 |

例: 音ゲー
- ActivityLog: 今日のスコア + memo「初見でクリアできた」
- Note (→Activity): 「この曲の攻略パターン」「運指メモ」

---

## データモデル

### Noteテーブル (Drizzle schema)

既存の`tasks`テーブル定義 (`infra/drizzle/schema.ts:108-138`) と同じパターンで定義する。

```typescript
export const notes = pgTable(
  "note",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    activityId: uuid("activity_id").references(() => activities.id),  // ON DELETE no action (task踏襲)
    title: text("title").notNull(),
    content: text("content").notNull().default(""),  // Markdown
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),  // 自動更新（必須: LWW判定の基盤）
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("note_user_id_idx").on(t.userId),
    index("note_activity_id_idx").on(t.activityId),
    index("note_created_at_idx").on(t.createdAt),
  ],
);
```

**外部キー制約:**
- `activity_id` は `ON DELETE no action`（既存task踏襲）。Activityはsoft delete運用で物理削除しない前提。

### ドメイン型

```typescript
// packages/domain/note/noteRecord.ts
export type NoteRecord = {
  id: string;
  userId: string;
  activityId: string | null;
  title: string;
  content: string;           // Markdown
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};
```

### 同期リクエスト型

```typescript
// packages/types/sync/request/note.ts
export const UpsertNoteRequestSchema = z.object({
  id: z.string().uuid(),
  activityId: z.string().uuid().nullable(),
  title: z.string().min(1).max(200),
  content: z.string().max(100_000),  // 100KB上限
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
});

export const SyncNotesRequestSchema = z.object({
  notes: z.array(UpsertNoteRequestSchema).max(100),  // task踏襲
});
```

### 同期レスポンス型

```typescript
// packages/types/sync/response/note.ts
const NoteRowSchema = z.object({
  id: z.string(),
  userId: z.string(),
  activityId: z.string().nullable(),
  title: z.string(),
  content: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

export const GetNotesV2ResponseSchema = z.object({
  notes: z.array(NoteRowSchema),
});

export const SyncNotesV2ResponseSchema = z.object({
  syncedIds: z.array(z.string()),       // クライアント優先で反映されたID
  serverWins: z.array(NoteRowSchema),   // サーバー優先で上書きされたレコード
  skippedIds: z.array(z.string()),      // バリデーション/所有権で弾かれたID
});
```

---

## 同期仕様

### Conflict Resolution（LWW）

既存の`taskSyncUsecase.ts`と同一ロジック:

- **判定方式**: `updatedAt` 比較による Last-Write-Wins
- **同一時刻**: server-wins（既存task踏襲: `lt(notes.updatedAt, sql\`excluded.updated_at\`)`で厳密未満でのみ上書き）
- **未来時刻の拒否**: `new Date(note.updatedAt) > new Date(Date.now() + 5*60*1000)` を`skippedIds`に含める（時刻操作によるclient-wins常時発動攻撃の防御）

### Ownership検証（必須）

**クライアントから送られた`activityId`がそのユーザー所有のActivityか必ず検証する。** 既存`taskSyncUsecase.ts:54-91`と同じパターン。

```typescript
// 疑似コード
const requestedActivityIds = [...new Set(noteList.map(n => n.activityId).filter(Boolean))];
const ownedActivityIds = await repo.getOwnedActivityIds(userId, requestedActivityIds);
const ownedSet = new Set(ownedActivityIds);

const validNotes = noteList.filter(note => {
  if (new Date(note.updatedAt) > maxAllowed) { skippedIds.push(note.id); return false; }
  if (note.activityId && !ownedSet.has(note.activityId)) { skippedIds.push(note.id); return false; }
  return true;
});
```

**これを省くとクライアントが偽造したactivityIdで他ユーザーのActivityにnoteを紐付けられる。**

### バッチサイズ

100件/リクエスト（既存task踏襲）。content max 100KB × 100件 = 10MB が上限目安。

---

## APIエンドポイント

### 認証付きCRUD: `/users/notes` (taskRoute踏襲)

`app.ts` に `.route("/users/notes", noteRoute)` として登録。

| Method | Path | 説明 |
|---|---|---|
| GET | `/users/notes` | ノート一覧（query: activityId） |
| GET | `/users/notes/:id` | 単一ノート取得 |
| POST | `/users/notes` | 作成 |
| PUT | `/users/notes/:id` | 更新 |
| DELETE | `/users/notes/:id` | 削除（soft delete） |
| POST | `/users/notes/:id/archive` | （将来拡張） |

**クエリの絞り込み順序（重要）**:
- 必ず `userId` で先に絞り込んでから `activityId` フィルタを適用する
- `WHERE user_id = $userId AND activity_id = $activityId` の順序で記述
- 順序を誤るとクロスユーザー漏洩リスク

### Sync API: `/users/v2/notes` (taskSyncRoute踏襲)

`app.ts` に `.route("/users/v2", noteSyncRoute)` として登録。

| Method | Path | 説明 |
|---|---|---|
| GET | `/users/v2/notes` | 増分取得（query: since） |
| POST | `/users/v2/notes/sync` | バッチ同期 |

### CRUD API と Sync API の責務分離

- **CRUD API**: 将来的なAPIキー経由の外部連携用（既存taskと同様）。フロントエンドからは**使わない**
- **Sync API**: フロントエンド/モバイルのDexie/SQLite との同期専用。syncEngineから呼ばれる
- フロントエンドはDexie repository経由のみ。オフラインファースト原則に従い、CRUD APIを直接fetchしない

---

## バックエンド実装

### ファイル構成（既存task踏襲）

```
apps/backend/feature/note/
  noteRoute.ts           # route定義
  noteHandler.ts         # HTTP層
  noteUsecase.ts         # ビジネスロジック
  noteRepository.ts      # DB層
  test/
    noteRoute.test.ts
    noteUsecase.test.ts

apps/backend/feature-sync/note/
  noteSyncRoute.ts
  noteSyncHandler.ts
  noteSyncUsecase.ts
  noteSyncRepository.ts
  test/
    noteSyncRoute.test.ts
    noteSyncUsecase.test.ts
```

### Repository命名（規約準拠）

メソッド名にドメイン名を含める:
- `createNote` / `updateNote` / `deleteNote` / `getNoteById` / `getNotesByUserId`
- `upsertNotes` / `getOwnedActivityIds`（既存活用）

### 層構造

route → handler → usecase → repository。handler→repository直接呼び出し禁止。
ファクトリ関数: `newNoteRepository` / `newNoteUsecase` / `newNoteHandler`。

### エラーハンドリング

try-catchは使わず、`throw new AppError(...)` で例外スロー。

---

## フロントエンド実装

### Dexieスキーマ

```typescript
// apps/frontend/src/db/schema.ts
// version bump（現在v7 → v8）
db.version(8).stores({
  notes: "id, _syncStatus, activityId, updatedAt",
  // ... 既存テーブル
});
```

**deletedAt の扱い**:
- soft deleteされたnoteはDexie上に残す（同期の整合性のため）
- 一覧表示時は `where('_syncStatus').notEqual('deleted')` + `deletedAt == null` でフィルタ
- Dexie repositoryの一覧取得メソッド内でフィルタする（UI側では意識不要）

### Repository

既存の `apps/frontend/src/db/taskRepository.ts` と同じパターン:
- CRUD操作は全てDexie経由
- `_syncStatus` で同期状態管理
- 共有logic `packages/frontend-shared/repositories/` に純粋関数を切り出し

### 同期エンジン統合

- `apps/frontend/src/sync/syncEngine.ts` にnoteの同期タスクを追加
- 共有の `packages/sync-engine/push/createSyncTasks.ts` パターンに合わせる
- `syncedIds` / `serverWins` / `skippedIds` を既存パターン通り処理

### initialSync統合（必須）

**新端末・再ログイン時にNoteを復元するため、以下に追加必須:**

- `apps/frontend/src/sync/initialSync.ts` にnotes の clear/count/fetch/write を追加
- 既存のtasksと同じ4段処理パターンを踏襲

### UI

初期リリース配置: **HamburgerMenu**（5タブ既に上限）。将来のタブカスタマイズ機能でBottomNavに昇格可能。

画面構成:
1. **ノート一覧** — タイトル・更新日時・紐づきActivity表示。Activity別フィルタ
2. **ノート編集** — タイトル入力 + Markdownエディタ + Activityセレクタ（任意）
3. **ノートプレビュー** — Markdownレンダリング表示
4. **Activity詳細画面にNotesセクション** — そのActivityに紐づくノート一覧リンク

**Markdownエディタ方針**:
- 初期リリース: プレーンテキスト入力 + プレビュー切り替え（編集/プレビュータブ）
- Markdownレンダリング: `react-markdown` + `rehype-sanitize` でXSS対策（ユーザー入力を直接innerHTMLしない）
- リッチエディタは後回し

---

## モバイル実装

### SQLiteスキーマ

`apps/mobile/src/db/migrations.ts` に新規マイグレーション追加:

```typescript
// MIGRATION_V{next}
`CREATE TABLE IF NOT EXISTS note (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  activity_id TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  _sync_status TEXT NOT NULL DEFAULT 'pending'
);
CREATE INDEX IF NOT EXISTS note_user_id_idx ON note(user_id);
CREATE INDEX IF NOT EXISTS note_activity_id_idx ON note(activity_id);
CREATE INDEX IF NOT EXISTS note_updated_at_idx ON note(updated_at);`
```

### Repository

`apps/mobile/src/repositories/noteRepository.ts`:
- expo-sqlite使用
- snake_case SQL ↔ camelCase TS マッピング
- `INSERT OR REPLACE` で同期時の一括更新

### initialSync

`apps/mobile/src/sync/initialSync.ts` にnotes対応追加（frontendと同じ4段処理）。

---

## テスト戦略

既存の`taskSyncUsecase.test.ts`と同じ粒度で以下を網羅する:

### usecase テスト
- 正常系: 新規作成・更新・削除同期
- conflict resolution: server新しい/client新しい/同一時刻
- 未来時刻拒否: `updatedAt`が`now + 5分`超のレコードが`skippedIds`に入る
- ownership検証NG: 他ユーザー所有のactivityIdが`skippedIds`に入る
- activityId=null は ownership検証スキップ
- 空配列入力
- 100件境界

### route テスト
- 認証ミドルウェア適用確認
- Zodバリデーション（title空、max超過等）
- `noopTracer` フォールバック動作（`c.get("tracer")`がundefinedでも動く）

### repository テスト
- upsert時のLWW挙動（`lt(notes.updatedAt, excluded.updated_at)`）
- soft delete された note が `getNotesByUserId` で返らない
- activityId によるスコープ絞り込み

### Hono固有テスト注意点
- `app.request()` は `executionCtx` を渡さない → `fireAndForget` でラップ
- テストファイル冒頭に `import { describe, expect, it } from "vitest"` 明示

---

## 実装スコープ（段階）

### Phase 1: コア機能
- [ ] DBマイグレーション（noteテーブル、`$onUpdate`フック含む）
- [ ] ドメイン型定義（`packages/domain/note/`）
- [ ] 同期リクエスト/レスポンス型（`packages/types/sync/request/note.ts`, `response/note.ts`）
- [ ] バックエンドCRUD API（`feature/note/`）
- [ ] バックエンド同期エンドポイント（`feature-sync/note/`、**ownership検証必須**）
- [ ] バックエンドテスト（usecase/route/repository）
- [ ] フロントエンドDexieスキーマ追加（v8 bump）
- [ ] フロントエンドリポジトリ（`noteRepository.ts`）+ 共有logic
- [ ] `syncEngine.ts` にnote同期タスク追加
- [ ] **`initialSync.ts` にnotes対応追加（必須）**
- [ ] UIコンポーネント（一覧・編集・プレビュー）
- [ ] HamburgerMenuにNotesリンク追加
- [ ] モバイルSQLiteマイグレーション追加
- [ ] モバイルリポジトリ・initialSync対応
- [ ] モバイルUIコンポーネント

### Phase 2: 連携強化
- [ ] Activity詳細画面にNotesセクション追加
- [ ] ノート一覧のActivity別フィルタ
- [ ] ノート検索（タイトル・本文全文検索）

---

# タブカスタマイズ機能 設計ドキュメント

## 概要

BottomNavのタブ構成をユーザーが自由に並び替え・選択できる機能。
iOS HIG / Material Designの5タブ上限を守りつつ、6個以上の機能（Note等）を柔軟に配置可能にする。

## 動機

- 現状5タブで上限に達している（Home, Daily, Stats, Goal, Tasks）
- Note等の新機能追加時にタブ枠が足りない
- ユーザーごとに利用頻度が異なる（例: Goalを常用する人、Tasksしか使わない人）

## 仕様

### 挙動

- 全タブ候補から任意の5個を選択し、並び順を決定
- 選ばれなかったタブはHamburgerMenuからアクセス可能
- 設定はサーバー同期 → PC⇔スマホで同じタブ構成

### タブ候補

| key | label | icon | デフォルト表示 |
|---|---|---|---|
| home | Actiko | LayoutGrid | Yes (固定1番目) |
| daily | Daily | CalendarDays | Yes |
| stats | Stats | BarChart3 | Yes |
| goals | Goal | Target | Yes |
| tasks | Tasks | CheckSquare | Yes |
| notes | Notes | FileText | No |

- Homeは常に1番目に固定（変更不可）
- 残り4枠をユーザーがカスタマイズ

### データモデル

```typescript
type TabPreference = {
  userId: string;
  tabs: string[];  // e.g. ["home", "daily", "notes", "goals", "tasks"]
  updatedAt: string;
};
```

保存先の選択肢:
- **A. userテーブルにJSON列追加** — シンプル。preferences的なものが増えたら再検討
- **B. user_preference テーブル新設** — 将来の拡張性。現時点ではover-engineering

### 同期

- 既存のuser sync or 専用のpreference syncで端末間同期
- conflict resolution: updatedAtが新しい方を採用（LWW）

### UI

- Settings画面に「タブカスタマイズ」セクション
- ドラッグ&ドロップで並び替え + トグルで表示/非表示
- 5個を超えて選択しようとしたら警告

## 実装スコープ

- [ ] データモデル決定（A or B）
- [ ] バックエンド保存・取得API
- [ ] 同期対応
- [ ] フロントエンド・モバイルのタブ描画をpreference駆動に変更
- [ ] Settings画面にカスタマイズUI追加

## 依存関係

Note機能とは独立。どちらを先に実装しても問題ない。
Note → HamburgerMenu配置で先行リリース → タブカスタマイズ実装後にタブ昇格、が自然な流れ。

# frontend-v2 vs mobile-v2 追加差分一覧

> fix-list.md に未記載だった差分。fix-list.md の全走査で発見。
>
> 凡例: 🔧 修正 / ✅ 許容

---

## A. Hooks層

| # | 箇所 | 内容 | 方針 |
|---|------|------|------|
| **N1** | `useSyncEngine.ts` cleanup | frontend-v2: cleanup関数を直接return。mobile-v2: `useRef`に保持して明示的にcleanup。mobile-v2の方が安全（re-render時のリスナーリーク防止） | 🔧 `packages/frontend-shared/hooks` にmobile-v2の形で共通化 |
| **N2** | `useLogForm.ts` handleManualSubmit | frontend-v2: `(e: React.FormEvent)` + `e.preventDefault()`。mobile-v2: 引数なし | ✅ 許容（プラットフォーム差異） |

## B. DB / Repository層

| # | 箇所 | 内容 | 方針 |
|---|------|------|------|
| **N3** | `activityLogRepository` | mobile-v2のみ `getActivityLogsBetween(startDate, endDate)` メソッドが存在。frontend-v2にはない | 🔧 `packages/domain/activityLog/activityLogRepository` に型定義を寄せる。両アプリはそれに依存する形で実装 |
| **N4** | `goalRepository.getAllGoals` | frontend-v2: Dexie挿入順。mobile-v2: `ORDER BY`なし（SQLiteのrowid順、ソート不定） | 🔧 共通で開始日時降順に統一 |
| **N5** | `activityLogRepository` upsert型 | mobile-v2: `Omit<LocalActivityLog, never>`（no-op）。frontend-v2: `Omit<..., "_syncStatus">` で明確 | 🔧 `packages/domain/activityLog/activityLogRepository` に寄せる |

## C. Sync層

| # | 箇所 | 内容 | 方針 |
|---|------|------|------|
| **N6** | `SyncResult` import | frontend-v2: ローカル `./types` 経由のre-export。mobile-v2: `@packages/domain` 直接import | 🔧 frontend-v2 のre-exportを除去して直接importに統一 |
| **N7** | 全syncモジュール エラーハンドリング | frontend-v2: `if (res.ok) { ... }` (ネスト)。mobile-v2: `if (!res.ok) return;` (early return) | 🔧 early returnに統一（見通しが良い） |
| **N8** | `syncActivities.ts` icon upload | frontend-v2: `Content-Type: "application/json"` を明示。mobile-v2: ヘッダー省略 | 🔧 mobile-v2 にも明示追加 |

## D. Components層

| # | 箇所 | 内容 | 方針 |
|---|------|------|------|
| **N9** | `CalendarPopover` callback名 | frontend-v2: `onDateSelect`。mobile-v2: `onSelectDate` | 🔧 Webに合わせて `onDateSelect` に統一 |
| **N10** | `LogFormBody` quantity input | frontend-v2: `onFocus` でテキスト全選択。mobile-v2: なし | 🔧 mobile-v2も `ref.current?.selectAll()` で寄せる（RN TextInputで実現可能） |
| **N11** | `ModalOverlay` props | frontend-v2: `{ onClose, children }`。mobile-v2: `{ visible, onClose, title, children }` (title必須) | ✅ 許容（RN Modalは`visible`が必須で合わせられない） |

# sync-engine へのロジック集約

## ステータス

決定

## コンテキスト

`apps/frontend/src/sync/` と `apps/mobile/src/sync/` に同期ロジックがほぼ完全に重複している。

| ファイル | Web↔Mobile 差分 |
|---------|----------------|
| syncState.ts | 0 行 |
| syncActivityLogs.ts | import path のみ |
| syncGoals.ts | import path のみ |
| syncTasks.ts | import path のみ |
| syncGoalFreezePeriods.ts | import path のみ |
| syncEngine.ts | NetworkAdapter default 1 行 |
| syncActivities.ts | API\_URL 取得 + Icons 内 DB 問い合わせ（4 行） |
| initialSync.ts | DB 操作部分（\~40 行） |

`packages/sync-engine` は既に chunkedSync、mappers、authenticatedFetch を持つが、個別 sync 関数とオーケストレーションはアプリ側に留まっている。

## 決定事項

### 1. 責務の分離

- **`packages/sync-engine`** = sync の「何をやるか」
  - 個別 sync 関数のロジック（chunk → API → mark 結果）
  - オーケストレーション（依存順序、retry/backoff、concurrent guard）
  - syncState（generation 管理）
  - 既存の chunkedSync、mappers、authenticatedFetch
- **`apps/*/src/sync/`** = sync の「何を使ってやるか」
  - プラットフォームアダプタ（NetworkAdapter、StorageAdapter）
  - 具体的なリポジトリ・apiClient の配線（wiring）
  - React hooks（useSyncEngine）

### 2. 共有化の手法: ファクトリ関数パターン

個別 sync 関数はリポジトリ・API コールバック・getSyncGeneration を引数で受け取るファクトリ関数にする。apiClient の型（Hono RPC）は packages/sync-engine に持ち込まず、コールバック経由で注入する。

```typescript
// packages/sync-engine/push/createSyncActivityLogs.ts
export function createSyncActivityLogs(deps: {
  repo: Pick<ActivityLogRepository, "getPendingSyncActivityLogs" | "markActivityLogsSynced" | "markActivityLogsFailed" | "upsertActivityLogsFromServer">;
  postSync: (chunk: LocalActivityLogRecord[]) => Promise<SyncResult>;
  getGeneration: () => number;
}) { ... }
```

```typescript
// apps/frontend/src/sync/index.ts（wiring）
export const syncActivityLogs = createSyncActivityLogs({
  repo: activityLogRepository,
  postSync: async (chunk) => {
    const res = await apiClient.users.v2["activity-logs"].sync.$post({ json: { logs: chunk } });
    if (!res.ok) throw new Error(`syncActivityLogs failed: ${res.status}`);
    return (await res.json()) as SyncResult;
  },
  getGeneration: getSyncGeneration,
});
```

### 3. 段階的実施

#### Phase 1（DB 抽象不要）

- `syncState` → `packages/sync-engine` にそのまま移動
- `syncActivityLogs`, `syncGoals`, `syncTasks`, `syncGoalFreezePeriods` → factory 化
- `syncEngine` orchestration → `createSyncEngine` factory 化
- テストを `packages/sync-engine` へ移動

#### Phase 2（DB 抽象が必要）

- `syncActivities`（syncActivityIcons 内の DB 問い合わせ差分を repository interface に吸収）
- `initialSync`（clearLocalData、authState 書き込み、count 確認、transaction API の差分を adapter 化）
  - repository interface に `clearAll()` 等を追加するか、transaction runner を引数で受け取る

### 4. 変更しないもの

- プラットフォームアダプタ（webPlatformAdapters、rnPlatformAdapters）
- React hooks（useSyncEngine）
- API パス

## 結果

- 同期順序・retry 戦略の変更が 1 箇所で済む
- 新テーブル追加時に factory パターンに従うだけで両プラットフォームに反映
- テストが packages/sync-engine に集約される
- apps/\*/src/sync/ は wiring + adapter + hooks のみに縮小

## 備考

- Phase 1 完了後にテスト・型チェック・lint の全通過を確認してから Phase 2 に進む
- apiClient の型は Hono RPC に依存するため packages/sync-engine には持ち込まない
- `NetworkAdapter` 型は既に `@packages/platform` に定義済みのものを利用する

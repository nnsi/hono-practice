import type {
  SyncRevision,
  SyncStatus,
  Syncable,
} from "@packages/domain/sync/syncableRecord";
import type { TaskRecord } from "@packages/domain/task/taskRecord";
import { trackServerTimeHeader } from "@packages/sync-engine";

type Row = { id: string; updatedAt: string };

/**
 * バックエンドの push 受理ルールを模したサーバー。
 * apps/backend/feature-sync の各 SyncRepository の upsert と同じく、
 * 保存済みより新しい updatedAt だけを受理し、受理した行の updatedAt を
 * サーバー時刻（NOW()）以上へ繰り上げる。
 */
export function createFakeSyncServer<T extends Row>(now: () => number) {
  const rows = new Map<string, T>();

  return {
    rows,
    get(id: string) {
      return rows.get(id);
    },
    /** 別端末からの書き込みを模す */
    put(row: T) {
      rows.set(row.id, row);
    },
    push(chunk: T[]) {
      const syncedIds: string[] = [];
      const syncedRevisions: SyncRevision[] = [];
      const serverWins: T[] = [];
      for (const incoming of chunk) {
        const stored = rows.get(incoming.id);
        if (
          stored &&
          Date.parse(stored.updatedAt) >= Date.parse(incoming.updatedAt)
        ) {
          serverWins.push(stored);
          continue;
        }
        const updatedAt = new Date(
          Math.max(Date.parse(incoming.updatedAt), now()),
        ).toISOString();
        rows.set(incoming.id, { ...incoming, updatedAt });
        syncedIds.push(incoming.id);
        syncedRevisions.push({ id: incoming.id, updatedAt });
      }
      // HTTP の Date ヘッダーは秒精度。認証 fetch と同じく全レスポンスで追跡する
      trackServerTimeHeader(
        new Date(Math.floor(now() / 1000) * 1000).toUTCString(),
      );
      return { syncedIds, syncedRevisions, serverWins, skippedIds: [] };
    },
  };
}

/** ローカルに保存されている現在の版（id + updatedAt）を返す */
export function revisionsOf(
  store: Map<string, Row>,
  ...ids: string[]
): SyncRevision[] {
  return ids.flatMap((id) => {
    const row = store.get(id);
    return row ? [{ id, updatedAt: row.updatedAt }] : [];
  });
}

/** 進行中の非同期処理（ローカル DB 読み書き・レスポンス処理）が落ち着くまで待つ */
export const settle = () =>
  new Promise<void>((resolve) => setImmediate(resolve));

/** レスポンスの到着をテストから制御できる通信路 */
export function createManualNetwork<TReq, TRes>(
  handle: (request: TReq) => TRes,
) {
  const queue: Array<() => void> = [];

  return {
    inFlight: () => queue.length,
    send(request: TReq): Promise<TRes> {
      return new Promise((resolve) => {
        queue.push(() => resolve(handle(request)));
      });
    },
    /** 先頭のリクエストをサーバーへ届け、レスポンス処理の完了を待つ */
    async deliverNext() {
      queue.shift()?.();
      await settle();
    },
    async deliverAll() {
      await settle();
      while (queue.length > 0) {
        queue.shift()?.();
        await settle();
      }
    },
  };
}

/** 各同期対象の DbAdapter を満たす、メモリ上のローカル DB */
export function createInMemoryAdapter<T extends Row>(userId = "user-1") {
  const store = new Map<string, Syncable<T>>();
  const all = async () => [...store.values()];

  const adapter = {
    async getUserId() {
      return userId;
    },
    async insert(row: Syncable<T>) {
      store.set(row.id, row);
    },
    async getAll(filter: (row: Syncable<T>) => boolean) {
      return [...store.values()].filter(filter);
    },
    getByDate: all,
    getByDateRange: all,
    getByGoalId: all,
    async getById(id: string) {
      return store.get(id);
    },
    async update(id: string, changes: Partial<Syncable<T>>) {
      const existing = store.get(id);
      if (existing) store.set(id, { ...existing, ...changes });
    },
    async getByIds(ids: string[]) {
      return ids.flatMap((id) => {
        const row = store.get(id);
        return row ? [row] : [];
      });
    },
    async updateSyncStatus(revisions: SyncRevision[], status: SyncStatus) {
      for (const revision of revisions) {
        const row = store.get(revision.id);
        if (row && row.updatedAt === revision.updatedAt) {
          store.set(row.id, { ...row, _syncStatus: status });
        }
      }
    },
    async bulkUpsertSynced(rows: Syncable<T>[]) {
      for (const row of rows) store.set(row.id, row);
    },
  };

  return { adapter, store };
}

export function createInMemoryTaskAdapter() {
  return createInMemoryAdapter<TaskRecord>();
}

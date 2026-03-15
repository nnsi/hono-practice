import type { ActivityLogRecord } from "@packages/domain/activityLog/activityLogRecord";
import type {
  ActivityLogRepository,
  CreateActivityLogInput,
  UpsertActivityLogFromServerInput,
} from "@packages/domain/activityLog/activityLogRepository";
import type {
  SyncStatus,
  Syncable,
} from "@packages/domain/sync/syncableRecord";
import { v7 as uuidv7 } from "uuid";

import { filterSafeUpserts } from "./syncHelpers";

type LocalActivityLog = Omit<ActivityLogRecord, "userId">;

export type ActivityLogDbAdapter = {
  insert(log: Syncable<LocalActivityLog>): Promise<void>;
  getAll(
    filter: (t: Syncable<LocalActivityLog>) => boolean,
  ): Promise<Syncable<LocalActivityLog>[]>;
  getByDate(date: string): Promise<Syncable<LocalActivityLog>[]>;
  getByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<Syncable<LocalActivityLog>[]>;
  update(
    id: string,
    changes: Partial<Syncable<LocalActivityLog>>,
  ): Promise<void>;
  getByIds(ids: string[]): Promise<Syncable<LocalActivityLog>[]>;
  updateSyncStatus(ids: string[], status: SyncStatus): Promise<void>;
  bulkUpsertSynced(logs: Syncable<LocalActivityLog>[]): Promise<void>;
};

export function newActivityLogRepository(
  adapter: ActivityLogDbAdapter,
): ActivityLogRepository {
  return {
    async createActivityLog(input: CreateActivityLogInput) {
      const now = new Date().toISOString();
      const log: Syncable<LocalActivityLog> = {
        ...input,
        id: uuidv7(),
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        _syncStatus: "pending",
      };
      await adapter.insert(log);
      return log;
    },

    async getActivityLogsByDate(date: string) {
      return adapter.getByDate(date);
    },

    async getActivityLogsBetween(startDate: string, endDate: string) {
      return adapter.getByDateRange(startDate, endDate);
    },

    async updateActivityLog(
      id: string,
      changes: Partial<
        Pick<
          LocalActivityLog,
          "quantity" | "memo" | "activityKindId" | "date" | "time"
        >
      >,
    ) {
      const now = new Date().toISOString();
      await adapter.update(id, {
        ...changes,
        updatedAt: now,
        _syncStatus: "pending",
      });
    },

    async softDeleteActivityLog(id: string) {
      const now = new Date().toISOString();
      await adapter.update(id, {
        deletedAt: now,
        updatedAt: now,
        _syncStatus: "pending",
      });
    },

    async softDeleteActivityLogByTaskId(taskId: string) {
      const now = new Date().toISOString();
      const targets = await adapter.getAll(
        (l) => l.taskId === taskId && !l.deletedAt,
      );
      for (const log of targets) {
        await adapter.update(log.id, {
          deletedAt: now,
          updatedAt: now,
          _syncStatus: "pending",
        });
      }
    },

    async getPendingSyncActivityLogs() {
      return adapter.getAll((l) => l._syncStatus === "pending");
    },

    async markActivityLogsSynced(ids: string[]) {
      if (ids.length === 0) return;
      await adapter.updateSyncStatus(ids, "synced");
    },

    async markActivityLogsFailed(ids: string[]) {
      if (ids.length === 0) return;
      await adapter.updateSyncStatus(ids, "failed");
    },

    async upsertActivityLogsFromServer(
      logs: UpsertActivityLogFromServerInput[],
    ) {
      if (logs.length === 0) return;
      const localRecords = await adapter.getByIds(logs.map((l) => l.id));
      const safe = filterSafeUpserts(logs, localRecords);
      if (safe.length === 0) return;
      await adapter.bulkUpsertSynced(
        safe.map((l) => ({ ...l, _syncStatus: "synced" as const })),
      );
    },
  };
}

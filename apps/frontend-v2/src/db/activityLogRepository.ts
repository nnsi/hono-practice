import { v7 as uuidv7 } from "uuid";
import { db, type DexieActivityLog } from "./schema";

type CreateInput = Pick<
  DexieActivityLog,
  "activityId" | "activityKindId" | "quantity" | "memo" | "date" | "time"
>;

export const activityLogRepository = {
  async createActivityLog(input: CreateInput) {
    const now = new Date().toISOString();
    const log: DexieActivityLog = {
      ...input,
      id: uuidv7(),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      _syncStatus: "pending",
    };
    await db.activityLogs.add(log);
    return log;
  },

  async getActivityLogsByDate(date: string) {
    return db.activityLogs
      .where("date")
      .equals(date)
      .filter((log) => log.deletedAt === null)
      .toArray();
  },

  async updateActivityLog(
    id: string,
    changes: Partial<
      Pick<
        DexieActivityLog,
        "quantity" | "memo" | "activityKindId" | "date" | "time"
      >
    >,
  ) {
    const now = new Date().toISOString();
    await db.activityLogs.update(id, {
      ...changes,
      updatedAt: now,
      _syncStatus: "pending",
    });
  },

  async softDeleteActivityLog(id: string) {
    const now = new Date().toISOString();
    await db.activityLogs.update(id, {
      deletedAt: now,
      updatedAt: now,
      _syncStatus: "pending",
    });
  },

  async getPendingSyncActivityLogs() {
    return db.activityLogs.where("_syncStatus").equals("pending").toArray();
  },

  async markActivityLogsSynced(ids: string[]) {
    if (ids.length === 0) return;
    await db.activityLogs
      .where("id")
      .anyOf(ids)
      .modify({ _syncStatus: "synced" as const });
  },

  async markActivityLogsFailed(ids: string[]) {
    if (ids.length === 0) return;
    await db.activityLogs
      .where("id")
      .anyOf(ids)
      .modify({ _syncStatus: "failed" as const });
  },

  async upsertActivityLogsFromServer(
    logs: Omit<DexieActivityLog, "_syncStatus">[],
  ) {
    await db.activityLogs.bulkPut(
      logs.map((log) => ({ ...log, _syncStatus: "synced" as const })),
    );
  },
};

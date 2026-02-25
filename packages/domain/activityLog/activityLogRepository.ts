import type { ActivityLogRecord } from "./activityLogRecord";
import type { Syncable } from "../sync/syncableRecord";

type LocalActivityLogRecord = Omit<ActivityLogRecord, "userId">;

export type CreateActivityLogInput = Pick<
  LocalActivityLogRecord,
  "activityId" | "activityKindId" | "quantity" | "memo" | "date" | "time"
>;

export type ActivityLogRepository = {
  createActivityLog(
    input: CreateActivityLogInput,
  ): Promise<Syncable<LocalActivityLogRecord>>;
  getActivityLogsByDate(
    date: string,
  ): Promise<Syncable<LocalActivityLogRecord>[]>;
  updateActivityLog(
    id: string,
    changes: Partial<
      Pick<
        LocalActivityLogRecord,
        "quantity" | "memo" | "activityKindId" | "date" | "time"
      >
    >,
  ): Promise<void>;
  softDeleteActivityLog(id: string): Promise<void>;
  getPendingSyncActivityLogs(): Promise<Syncable<LocalActivityLogRecord>[]>;
  markActivityLogsSynced(ids: string[]): Promise<void>;
  markActivityLogsFailed(ids: string[]): Promise<void>;
  upsertActivityLogsFromServer(logs: LocalActivityLogRecord[]): Promise<void>;
};

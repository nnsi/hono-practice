import type { Syncable } from "../sync/syncableRecord";
import type { ActivityLogRecord } from "./activityLogRecord";

type LocalActivityLogRecord = Omit<ActivityLogRecord, "userId">;

export type CreateActivityLogInput = Pick<
  LocalActivityLogRecord,
  | "activityId"
  | "activityKindId"
  | "quantity"
  | "memo"
  | "date"
  | "time"
  | "taskId"
>;

/**
 * The input type for upsertActivityLogsFromServer.
 * Server sends full record data without userId (local-only) and without _syncStatus.
 */
export type UpsertActivityLogFromServerInput = LocalActivityLogRecord;

export type ActivityLogRepository = {
  createActivityLog(
    input: CreateActivityLogInput,
  ): Promise<Syncable<LocalActivityLogRecord>>;
  getActivityLogsByDate(
    date: string,
  ): Promise<Syncable<LocalActivityLogRecord>[]>;
  getActivityLogsBetween(
    startDate: string,
    endDate: string,
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
  softDeleteActivityLogByTaskId(taskId: string): Promise<void>;
  getPendingSyncActivityLogs(): Promise<Syncable<LocalActivityLogRecord>[]>;
  markActivityLogsSynced(ids: string[]): Promise<void>;
  markActivityLogsFailed(ids: string[]): Promise<void>;
  upsertActivityLogsFromServer(
    logs: UpsertActivityLogFromServerInput[],
  ): Promise<void>;
};

import Dexie, { type Table } from "dexie";
import type { Syncable } from "@packages/domain/sync/syncableRecord";
import type {
  ActivityRecord,
  ActivityKindRecord,
} from "@packages/domain/activity/activityRecord";
import type { ActivityLogRecord } from "@packages/domain/activityLog/activityLogRecord";
import type { GoalRecord } from "@packages/domain/goal/goalRecord";
import type { TaskRecord } from "@packages/domain/task/taskRecord";

export type { SyncStatus } from "@packages/domain/sync/syncableRecord";

export type DexieActivityLog = Syncable<Omit<ActivityLogRecord, "userId">>;
export type DexieActivity = Syncable<ActivityRecord>;
export type DexieActivityKind = Syncable<ActivityKindRecord>;
export type DexieGoal = Syncable<GoalRecord>;
export type DexieTask = Syncable<TaskRecord>;

export type DexieActivityIconBlob = {
  activityId: string;
  base64: string;
  mimeType: string;
};

export type DexieActivityIconDeleteQueue = {
  activityId: string;
};

export type DexieAuthState = {
  id: "current";
  userId: string;
  lastLoginAt: string;
};

export class ActikoDatabase extends Dexie {
  activityLogs!: Table<DexieActivityLog, string>;
  activities!: Table<DexieActivity, string>;
  activityKinds!: Table<DexieActivityKind, string>;
  goals!: Table<DexieGoal, string>;
  tasks!: Table<DexieTask, string>;
  activityIconBlobs!: Table<DexieActivityIconBlob, string>;
  activityIconDeleteQueue!: Table<DexieActivityIconDeleteQueue, string>;
  authState!: Table<DexieAuthState, string>;

  constructor() {
    super("actiko");
    this.version(1).stores({
      activityLogs: "id, activityId, date, _syncStatus, [date+activityId]",
      activities: "id, orderIndex",
      activityKinds: "id, activityId",
      authState: "id",
    });
    this.version(2)
      .stores({
        activityLogs: "id, activityId, date, _syncStatus, [date+activityId]",
        activities: "id, orderIndex, _syncStatus",
        activityKinds: "id, activityId, _syncStatus",
        goals: "id, activityId, _syncStatus",
        tasks: "id, _syncStatus, startDate, dueDate",
        authState: "id",
      })
      .upgrade((tx) => {
        return Promise.all([
          tx
            .table("activities")
            .toCollection()
            .modify((a) => {
              if (!a._syncStatus) a._syncStatus = "synced";
            }),
          tx
            .table("activityKinds")
            .toCollection()
            .modify((k) => {
              if (!k._syncStatus) k._syncStatus = "synced";
            }),
        ]);
      });
    this.version(3).stores({
      activityLogs: "id, activityId, date, _syncStatus, [date+activityId]",
      activities: "id, orderIndex, _syncStatus",
      activityKinds: "id, activityId, _syncStatus",
      goals: "id, activityId, _syncStatus",
      tasks: "id, _syncStatus, startDate, dueDate",
      activityIconBlobs: "activityId",
      activityIconDeleteQueue: "activityId",
      authState: "id",
    });
  }
}

export const db = new ActikoDatabase();

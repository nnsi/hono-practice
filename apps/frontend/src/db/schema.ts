import type { Syncable } from "@packages/domain";
import type {
  ActivityKindRecord,
  ActivityRecord,
} from "@packages/domain/activity/activityRecord";
import type { ActivityLogRecord } from "@packages/domain/activityLog/activityLogRecord";
import type { GoalFreezePeriodRecord } from "@packages/domain/goal/goalFreezePeriod";
import type { GoalRecord } from "@packages/domain/goal/goalRecord";
import type { TaskRecord } from "@packages/domain/task/taskRecord";
import Dexie, { type Table } from "dexie";

export type { SyncStatus } from "@packages/domain";

export type DexieActivityLog = Syncable<Omit<ActivityLogRecord, "userId">>;
export type DexieActivity = Syncable<ActivityRecord>;
export type DexieActivityKind = Syncable<ActivityKindRecord>;
export type DexieGoal = Syncable<GoalRecord>;
export type DexieGoalFreezePeriod = Syncable<GoalFreezePeriodRecord>;
export type DexieTask = Syncable<TaskRecord>;

export type DexieActivityIconBlob = {
  activityId: string;
  base64: string;
  mimeType: string;
  synced?: boolean;
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
  goalFreezePeriods!: Table<DexieGoalFreezePeriod, string>;
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
    this.version(4)
      .stores({
        activityLogs: "id, activityId, date, _syncStatus, [date+activityId]",
        activities: "id, orderIndex, _syncStatus",
        activityKinds: "id, activityId, _syncStatus",
        goals: "id, activityId, _syncStatus",
        tasks: "id, _syncStatus, startDate, dueDate",
        activityIconBlobs: "activityId",
        activityIconDeleteQueue: "activityId",
        authState: "id",
      })
      .upgrade((tx) => {
        return tx
          .table("activities")
          .toCollection()
          .modify((a) => {
            if (!a.recordingMode) {
              const timeUnits = [
                "時",
                "分",
                "秒",
                "hour",
                "min",
                "sec",
                "時間",
              ];
              const unit = (a.quantityUnit || "").toLowerCase();
              const isTime = timeUnits.some((u: string) => unit.includes(u));
              a.recordingMode = isTime ? "timer" : "manual";
              a.recordingModeConfig = null;
            }
          });
      });
    this.version(5).stores({
      activityLogs: "id, activityId, date, _syncStatus, [date+activityId]",
      activities: "id, orderIndex, _syncStatus",
      activityKinds: "id, activityId, _syncStatus",
      goals: "id, activityId, _syncStatus",
      goalFreezePeriods: "id, goalId, _syncStatus",
      tasks: "id, _syncStatus, startDate, dueDate",
      activityIconBlobs: "activityId",
      activityIconDeleteQueue: "activityId",
      authState: "id",
    });
    this.version(6).stores({
      activityLogs:
        "id, activityId, date, _syncStatus, [date+activityId], taskId",
      activities: "id, orderIndex, _syncStatus",
      activityKinds: "id, activityId, _syncStatus",
      goals: "id, activityId, _syncStatus",
      goalFreezePeriods: "id, goalId, _syncStatus",
      tasks: "id, _syncStatus, startDate, dueDate",
      activityIconBlobs: "activityId",
      activityIconDeleteQueue: "activityId",
      authState: "id",
    });
    this.version(7)
      .stores({
        activityLogs:
          "id, activityId, date, _syncStatus, [date+activityId], taskId",
        activities: "id, orderIndex, _syncStatus",
        activityKinds: "id, activityId, _syncStatus",
        goals: "id, activityId, _syncStatus",
        goalFreezePeriods: "id, goalId, _syncStatus",
        tasks: "id, _syncStatus, startDate, dueDate",
        activityIconBlobs: "activityId",
        activityIconDeleteQueue: "activityId",
        authState: "id",
      })
      .upgrade((tx) => {
        return tx
          .table("activities")
          .toCollection()
          .modify((a) => {
            if (a.showCombinedStats === undefined) {
              a.showCombinedStats = true;
            }
          });
      });
  }
}

export const db = new ActikoDatabase();

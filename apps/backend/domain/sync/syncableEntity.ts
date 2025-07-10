import type {
  Activity,
  ActivityGoal,
  ActivityLog,
  Task,
} from "@backend/domain";

// 同期可能なエンティティの基本型
export type SyncableBase = {
  type: "persisted";
  updatedAt: Date;
  version?: number;
};

// 各エンティティの同期用型
export type SyncableActivity = Extract<Activity, { type: "persisted" }> & {
  version?: number;
};

export type SyncableActivityLog = Extract<
  ActivityLog,
  { type: "persisted" }
> & {
  version?: number;
};

export type SyncableActivityGoal = Extract<
  ActivityGoal,
  { type: "persisted" }
> & {
  version?: number;
};

export type SyncableTask = Extract<Task, { type: "persisted" }> & {
  version?: number;
};

// 型ガード関数
export function isSyncableActivity(
  entity: Activity,
): entity is SyncableActivity {
  return entity.type === "persisted";
}

export function isSyncableActivityLog(
  entity: ActivityLog,
): entity is SyncableActivityLog {
  return entity.type === "persisted";
}

export function isSyncableActivityGoal(
  entity: ActivityGoal,
): entity is SyncableActivityGoal {
  return entity.type === "persisted";
}

export function isSyncableTask(entity: Task): entity is SyncableTask {
  return entity.type === "persisted";
}

// エンティティを同期可能な型に変換
export function toSyncableActivity(activity: Activity): SyncableActivity {
  if (!isSyncableActivity(activity)) {
    throw new Error("Activity must be persisted type for sync");
  }
  return activity;
}

export function toSyncableActivityLog(
  activityLog: ActivityLog,
): SyncableActivityLog {
  if (!isSyncableActivityLog(activityLog)) {
    throw new Error("ActivityLog must be persisted type for sync");
  }
  return activityLog;
}

export function toSyncableActivityGoal(
  activityGoal: ActivityGoal,
): SyncableActivityGoal {
  if (!isSyncableActivityGoal(activityGoal)) {
    throw new Error("ActivityGoal must be persisted type for sync");
  }
  return activityGoal;
}

export function toSyncableTask(task: Task): SyncableTask {
  if (!isSyncableTask(task)) {
    throw new Error("Task must be persisted type for sync");
  }
  return task;
}

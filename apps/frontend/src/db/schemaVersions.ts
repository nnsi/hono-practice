import type Dexie from "dexie";

export function registerPreviousVersions(db: Dexie) {
  db.version(1).stores({
    activityLogs: "id, activityId, date, _syncStatus, [date+activityId]",
    activities: "id, orderIndex",
    activityKinds: "id, activityId",
    authState: "id",
  });
  db.version(2)
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
  db.version(3).stores({
    activityLogs: "id, activityId, date, _syncStatus, [date+activityId]",
    activities: "id, orderIndex, _syncStatus",
    activityKinds: "id, activityId, _syncStatus",
    goals: "id, activityId, _syncStatus",
    tasks: "id, _syncStatus, startDate, dueDate",
    activityIconBlobs: "activityId",
    activityIconDeleteQueue: "activityId",
    authState: "id",
  });
  db.version(4)
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
            const timeUnits = ["時", "分", "秒", "hour", "min", "sec", "時間"];
            const unit = (a.quantityUnit || "").toLowerCase();
            const isTime = timeUnits.some((u: string) => unit.includes(u));
            a.recordingMode = isTime ? "timer" : "manual";
            a.recordingModeConfig = null;
          }
        });
    });
  db.version(5).stores({
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
  db.version(6).stores({
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
  db.version(7)
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
  db.version(8).stores({
    activityLogs:
      "id, activityId, date, _syncStatus, [date+activityId], taskId",
    activities: "id, orderIndex, _syncStatus",
    activityKinds: "id, activityId, _syncStatus",
    goals: "id, activityId, _syncStatus",
    goalFreezePeriods: "id, goalId, _syncStatus",
    tasks: "id, _syncStatus, startDate, dueDate",
    notes: "id, _syncStatus, activityId, updatedAt",
    activityIconBlobs: "activityId",
    activityIconDeleteQueue: "activityId",
    authState: "id",
  });
}

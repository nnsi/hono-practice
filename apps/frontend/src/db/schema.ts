import type { Syncable } from "@packages/domain";
import type {
  ActivityKindRecord,
  ActivityRecord,
} from "@packages/domain/activity/activityRecord";
import type { ActivityLogRecord } from "@packages/domain/activityLog/activityLogRecord";
import type { GoalFreezePeriodRecord } from "@packages/domain/goal/goalFreezePeriod";
import type { GoalRecord } from "@packages/domain/goal/goalRecord";
import type { NoteRecord } from "@packages/domain/note/noteRecord";
import type { TaskRecord } from "@packages/domain/task/taskRecord";
import type { TutorialStatus } from "@packages/frontend-shared/hooks";
import type { TaskScheduleRecord } from "@packages/sync-engine";
import Dexie, { type Table } from "dexie";

import { registerPreviousVersions } from "./schemaVersions";

export type { SyncStatus } from "@packages/domain";

export type DexieActivityLog = Syncable<Omit<ActivityLogRecord, "userId">>;
export type DexieActivity = Syncable<ActivityRecord>;
export type DexieActivityKind = Syncable<ActivityKindRecord>;
type DexieGoal = Syncable<GoalRecord>;
type DexieGoalFreezePeriod = Syncable<GoalFreezePeriodRecord>;
type DexieTask = Syncable<TaskRecord>;
type DexieNote = Syncable<NoteRecord>;

export type DexieActivityIconBlob = {
  activityId: string;
  base64: string;
  mimeType: string;
  synced?: boolean;
};

type DexieActivityIconDeleteQueue = {
  activityId: string;
};

type DexieAuthState = {
  id: "current";
  userId: string;
  lastLoginAt: string;
  plan?: string;
  tutorialStatus?: TutorialStatus;
};

class ActikoDatabase extends Dexie {
  activityLogs!: Table<DexieActivityLog, string>;
  activities!: Table<DexieActivity, string>;
  activityKinds!: Table<DexieActivityKind, string>;
  goals!: Table<DexieGoal, string>;
  goalFreezePeriods!: Table<DexieGoalFreezePeriod, string>;
  taskSchedules!: Table<Syncable<TaskScheduleRecord>, string>;
  tasks!: Table<DexieTask, string>;
  notes!: Table<DexieNote, string>;
  activityIconBlobs!: Table<DexieActivityIconBlob, string>;
  activityIconDeleteQueue!: Table<DexieActivityIconDeleteQueue, string>;
  authState!: Table<DexieAuthState, string>;

  constructor() {
    super("actiko");
    registerPreviousVersions(this);
    this.version(9).stores({
      taskSchedules: "id, _syncStatus, activityId, updatedAt",
      tasks: "id, _syncStatus, startDate, dueDate, [scheduleId+scheduledDate]",
    });
  }
}

export const db = new ActikoDatabase();

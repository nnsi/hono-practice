import Dexie, { type Table } from "dexie";

export type SyncStatus = "synced" | "pending" | "failed";

export type DexieActivityLog = {
  id: string;
  activityId: string;
  activityKindId: string | null;
  quantity: number | null;
  memo: string;
  date: string;
  time: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  _syncStatus: SyncStatus;
};

export type DexieActivity = {
  id: string;
  userId: string;
  name: string;
  label: string;
  emoji: string;
  iconType: "emoji" | "upload" | "generate";
  iconUrl: string | null;
  iconThumbnailUrl: string | null;
  description: string;
  quantityUnit: string;
  orderIndex: string;
  showCombinedStats: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  _syncStatus: SyncStatus;
};

export type DexieActivityKind = {
  id: string;
  activityId: string;
  name: string;
  color: string | null;
  orderIndex: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  _syncStatus: SyncStatus;
};

export type DexieGoal = {
  id: string;
  userId: string;
  activityId: string;
  dailyTargetQuantity: number;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  description: string;
  currentBalance: number;
  totalTarget: number;
  totalActual: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  _syncStatus: SyncStatus;
};

export type DexieTask = {
  id: string;
  userId: string;
  title: string;
  startDate: string | null;
  dueDate: string | null;
  doneDate: string | null;
  memo: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  _syncStatus: SyncStatus;
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
  }
}

export const db = new ActikoDatabase();

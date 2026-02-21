import Dexie, { type Table } from "dexie";

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
  _syncStatus: "synced" | "pending" | "failed";
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
  authState!: Table<DexieAuthState, string>;

  constructor() {
    super("actiko");
    this.version(1).stores({
      activityLogs: "id, activityId, date, _syncStatus, [date+activityId]",
      activities: "id, orderIndex",
      activityKinds: "id, activityId",
      authState: "id",
    });
  }
}

export const db = new ActikoDatabase();

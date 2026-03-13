import { v7 as uuidv7 } from "uuid";

import { type DexieGoalFreezePeriod, db } from "./schema";

type CreateFreezePeriodInput = {
  goalId: string;
  startDate: string;
  endDate?: string | null;
};

type UpdateFreezePeriodInput = Partial<
  Pick<DexieGoalFreezePeriod, "startDate" | "endDate">
>;

export const goalFreezePeriodRepository = {
  async createGoalFreezePeriod(input: CreateFreezePeriodInput) {
    const now = new Date().toISOString();
    const authState = await db.authState.get("current");
    if (!authState?.userId) {
      throw new Error("Cannot create freeze period: userId is not set");
    }
    const period: DexieGoalFreezePeriod = {
      id: uuidv7(),
      goalId: input.goalId,
      userId: authState.userId,
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      _syncStatus: "pending",
    };
    await db.goalFreezePeriods.add(period);
    return period;
  },

  async getFreezePeriodsByGoalId(goalId: string) {
    return db.goalFreezePeriods
      .where("goalId")
      .equals(goalId)
      .filter((fp) => !fp.deletedAt)
      .toArray();
  },

  async updateGoalFreezePeriod(id: string, changes: UpdateFreezePeriodInput) {
    const now = new Date().toISOString();
    await db.goalFreezePeriods.update(id, {
      ...changes,
      updatedAt: now,
      _syncStatus: "pending",
    });
  },

  async softDeleteGoalFreezePeriod(id: string) {
    const now = new Date().toISOString();
    await db.goalFreezePeriods.update(id, {
      deletedAt: now,
      updatedAt: now,
      _syncStatus: "pending",
    });
  },

  async getPendingSyncFreezePeriods() {
    return db.goalFreezePeriods
      .where("_syncStatus")
      .equals("pending")
      .toArray();
  },

  async markFreezePeriodsSynced(ids: string[]) {
    if (ids.length === 0) return;
    await db.goalFreezePeriods
      .where("id")
      .anyOf(ids)
      .modify({ _syncStatus: "synced" as const });
  },

  async markFreezePeriodsFailed(ids: string[]) {
    if (ids.length === 0) return;
    await db.goalFreezePeriods
      .where("id")
      .anyOf(ids)
      .modify({ _syncStatus: "failed" as const });
  },

  async upsertFreezePeriodsFromServer(
    periods: Omit<DexieGoalFreezePeriod, "_syncStatus">[],
  ) {
    if (periods.length === 0) return;
    const serverIds = periods.map((p) => p.id);
    const localRecords = await db.goalFreezePeriods
      .where("id")
      .anyOf(serverIds)
      .toArray();
    const localMap = new Map(localRecords.map((r) => [r.id, r]));
    const safe = periods.filter((p) => {
      const local = localMap.get(p.id);
      if (!local) return true;
      if (local._syncStatus === "pending") return false;
      if (new Date(local.updatedAt) > new Date(p.updatedAt)) return false;
      return true;
    });
    if (safe.length === 0) return;
    await db.goalFreezePeriods.bulkPut(
      safe.map((p) => ({ ...p, _syncStatus: "synced" as const })),
    );
  },
};

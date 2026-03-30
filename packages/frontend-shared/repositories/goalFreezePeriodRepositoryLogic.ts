import type { GoalFreezePeriodRecord } from "@packages/domain/goal/goalFreezePeriod";
import type {
  SyncStatus,
  Syncable,
} from "@packages/domain/sync/syncableRecord";
import { getServerNowISOString } from "@packages/sync-engine";
import { v7 as uuidv7 } from "uuid";

import { filterSafeUpserts } from "./syncHelpers";

type CreateFreezePeriodInput = {
  goalId: string;
  startDate: string;
  endDate?: string | null;
};

type UpdateFreezePeriodInput = Partial<
  Pick<GoalFreezePeriodRecord, "startDate" | "endDate">
>;

export type GoalFreezePeriodDbAdapter = {
  getUserId(): Promise<string>;
  insert(period: Syncable<GoalFreezePeriodRecord>): Promise<void>;
  getByGoalId(goalId: string): Promise<Syncable<GoalFreezePeriodRecord>[]>;
  getAll(
    filter: (p: Syncable<GoalFreezePeriodRecord>) => boolean,
  ): Promise<Syncable<GoalFreezePeriodRecord>[]>;
  update(
    id: string,
    changes: Partial<Syncable<GoalFreezePeriodRecord>>,
  ): Promise<void>;
  getByIds(ids: string[]): Promise<Syncable<GoalFreezePeriodRecord>[]>;
  updateSyncStatus(ids: string[], status: SyncStatus): Promise<void>;
  bulkUpsertSynced(periods: Syncable<GoalFreezePeriodRecord>[]): Promise<void>;
};

export type GoalFreezePeriodRepository = {
  createGoalFreezePeriod(
    input: CreateFreezePeriodInput,
  ): Promise<Syncable<GoalFreezePeriodRecord>>;
  getFreezePeriodsByGoalId(
    goalId: string,
  ): Promise<Syncable<GoalFreezePeriodRecord>[]>;
  updateGoalFreezePeriod(
    id: string,
    changes: UpdateFreezePeriodInput,
  ): Promise<void>;
  softDeleteGoalFreezePeriod(id: string): Promise<void>;
  getPendingSyncFreezePeriods(): Promise<Syncable<GoalFreezePeriodRecord>[]>;
  markFreezePeriodsSynced(ids: string[]): Promise<void>;
  markFreezePeriodsFailed(ids: string[]): Promise<void>;
  upsertFreezePeriodsFromServer(
    periods: GoalFreezePeriodRecord[],
  ): Promise<void>;
};

export function newGoalFreezePeriodRepository(
  adapter: GoalFreezePeriodDbAdapter,
): GoalFreezePeriodRepository {
  return {
    async createGoalFreezePeriod(input: CreateFreezePeriodInput) {
      const now = getServerNowISOString();
      const userId = await adapter.getUserId();
      const period: Syncable<GoalFreezePeriodRecord> = {
        id: uuidv7(),
        goalId: input.goalId,
        userId,
        startDate: input.startDate,
        endDate: input.endDate ?? null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        _syncStatus: "pending",
      };
      await adapter.insert(period);
      return period;
    },

    async getFreezePeriodsByGoalId(goalId: string) {
      return adapter.getByGoalId(goalId);
    },

    async updateGoalFreezePeriod(id: string, changes: UpdateFreezePeriodInput) {
      const now = getServerNowISOString();
      await adapter.update(id, {
        ...changes,
        updatedAt: now,
        _syncStatus: "pending",
      });
    },

    async softDeleteGoalFreezePeriod(id: string) {
      const now = getServerNowISOString();
      await adapter.update(id, {
        deletedAt: now,
        updatedAt: now,
        _syncStatus: "pending",
      });
    },

    async getPendingSyncFreezePeriods() {
      return adapter.getAll(
        (p) => p._syncStatus === "pending" || p._syncStatus === "failed",
      );
    },

    async markFreezePeriodsSynced(ids: string[]) {
      if (ids.length === 0) return;
      await adapter.updateSyncStatus(ids, "synced");
    },

    async markFreezePeriodsFailed(ids: string[]) {
      if (ids.length === 0) return;
      await adapter.updateSyncStatus(ids, "failed");
    },

    async upsertFreezePeriodsFromServer(periods: GoalFreezePeriodRecord[]) {
      if (periods.length === 0) return;
      const localRecords = await adapter.getByIds(periods.map((p) => p.id));
      const safe = filterSafeUpserts(periods, localRecords);
      if (safe.length === 0) return;
      await adapter.bulkUpsertSynced(
        safe.map((p) => ({ ...p, _syncStatus: "synced" as const })),
      );
    },
  };
}

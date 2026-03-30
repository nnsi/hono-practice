import type { GoalRecord } from "@packages/domain/goal/goalRecord";
import type {
  CreateGoalInput,
  GoalRepository,
  UpdateGoalInput,
} from "@packages/domain/goal/goalRepository";
import type {
  SyncStatus,
  Syncable,
} from "@packages/domain/sync/syncableRecord";
import { getServerNowISOString } from "@packages/sync-engine";
import { v7 as uuidv7 } from "uuid";

import { filterSafeUpserts } from "./syncHelpers";

export type GoalDbAdapter = {
  getUserId(): Promise<string>;
  insert(goal: Syncable<GoalRecord>): Promise<void>;
  getAll(
    filter: (g: Syncable<GoalRecord>) => boolean,
  ): Promise<Syncable<GoalRecord>[]>;
  update(id: string, changes: Partial<Syncable<GoalRecord>>): Promise<void>;
  getByIds(ids: string[]): Promise<Syncable<GoalRecord>[]>;
  updateSyncStatus(ids: string[], status: SyncStatus): Promise<void>;
  bulkUpsertSynced(goals: Syncable<GoalRecord>[]): Promise<void>;
};

export function newGoalRepository(adapter: GoalDbAdapter): GoalRepository {
  return {
    async createGoal(input: CreateGoalInput) {
      const now = getServerNowISOString();
      const userId = await adapter.getUserId();
      const goal: Syncable<GoalRecord> = {
        id: uuidv7(),
        userId,
        activityId: input.activityId,
        dailyTargetQuantity: input.dailyTargetQuantity,
        dayTargets: input.dayTargets ?? null,
        startDate: input.startDate,
        endDate: input.endDate ?? null,
        isActive: true,
        description: input.description ?? "",
        debtCap: input.debtCap ?? null,
        currentBalance: 0,
        totalTarget: 0,
        totalActual: 0,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        _syncStatus: "pending",
      };
      await adapter.insert(goal);
      return goal;
    },

    async getAllGoals() {
      const goals = await adapter.getAll((g) => !g.deletedAt);
      return goals.sort((a, b) => b.startDate.localeCompare(a.startDate));
    },

    async updateGoal(id: string, changes: UpdateGoalInput) {
      const now = getServerNowISOString();
      await adapter.update(id, {
        ...changes,
        updatedAt: now,
        _syncStatus: "pending",
      });
    },

    async softDeleteGoal(id: string) {
      const now = getServerNowISOString();
      await adapter.update(id, {
        deletedAt: now,
        updatedAt: now,
        _syncStatus: "pending",
      });
    },

    async getPendingSyncGoals() {
      return adapter.getAll(
        (g) => g._syncStatus === "pending" || g._syncStatus === "failed",
      );
    },

    async markGoalsSynced(ids: string[]) {
      if (ids.length === 0) return;
      await adapter.updateSyncStatus(ids, "synced");
    },

    async markGoalsFailed(ids: string[]) {
      if (ids.length === 0) return;
      await adapter.updateSyncStatus(ids, "failed");
    },

    async upsertGoalsFromServer(goals: GoalRecord[]) {
      if (goals.length === 0) return;
      const localRecords = await adapter.getByIds(goals.map((g) => g.id));
      const safe = filterSafeUpserts(goals, localRecords);
      if (safe.length === 0) return;
      await adapter.bulkUpsertSynced(
        safe.map((g) => ({ ...g, _syncStatus: "synced" as const })),
      );
    },
  };
}

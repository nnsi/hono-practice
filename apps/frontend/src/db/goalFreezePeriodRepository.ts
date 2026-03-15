import {
  type GoalFreezePeriodDbAdapter,
  type GoalFreezePeriodRepository,
  newGoalFreezePeriodRepository,
} from "@packages/frontend-shared/repositories";

import { db } from "./schema";

const adapter: GoalFreezePeriodDbAdapter = {
  async getUserId() {
    const authState = await db.authState.get("current");
    if (!authState?.userId) {
      throw new Error("Cannot create freeze period: userId is not set");
    }
    return authState.userId;
  },
  async insert(period) {
    await db.goalFreezePeriods.add(period);
  },
  async getByGoalId(goalId) {
    return db.goalFreezePeriods
      .where("goalId")
      .equals(goalId)
      .filter((fp) => !fp.deletedAt)
      .toArray();
  },
  async getAll(filter) {
    return db.goalFreezePeriods.filter(filter).toArray();
  },
  async update(id, changes) {
    await db.goalFreezePeriods.update(id, changes);
  },
  async getByIds(ids) {
    return db.goalFreezePeriods.where("id").anyOf(ids).toArray();
  },
  async updateSyncStatus(ids, status) {
    await db.goalFreezePeriods
      .where("id")
      .anyOf(ids)
      .modify({ _syncStatus: status });
  },
  async bulkUpsertSynced(periods) {
    await db.goalFreezePeriods.bulkPut(periods);
  },
};

export const goalFreezePeriodRepository = newGoalFreezePeriodRepository(
  adapter,
) satisfies GoalFreezePeriodRepository;

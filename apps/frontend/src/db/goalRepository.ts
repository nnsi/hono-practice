import type { GoalRepository } from "@packages/domain/goal/goalRepository";
import {
  type GoalDbAdapter,
  newGoalRepository,
} from "@packages/frontend-shared/repositories";

import { db } from "./schema";

const adapter: GoalDbAdapter = {
  async getUserId() {
    const authState = await db.authState.get("current");
    if (!authState?.userId) {
      throw new Error("Cannot create goal: userId is not set");
    }
    return authState.userId;
  },
  async insert(goal) {
    await db.goals.add(goal);
  },
  async getAll(filter) {
    return db.goals.filter(filter).toArray();
  },
  async update(id, changes) {
    await db.goals.update(id, changes);
  },
  async getByIds(ids) {
    return db.goals.where("id").anyOf(ids).toArray();
  },
  async updateSyncStatus(ids, status) {
    await db.goals.where("id").anyOf(ids).modify({ _syncStatus: status });
  },
  async bulkUpsertSynced(goals) {
    await db.goals.bulkPut(goals);
  },
};

export const goalRepository = newGoalRepository(
  adapter,
) satisfies GoalRepository;

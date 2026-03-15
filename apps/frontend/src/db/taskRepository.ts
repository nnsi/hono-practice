import type { TaskRepository } from "@packages/domain/task/taskRepository";
import {
  type TaskDbAdapter,
  newTaskRepository,
} from "@packages/frontend-shared/repositories";

import { db } from "./schema";

const adapter: TaskDbAdapter = {
  async getUserId() {
    const authState = await db.authState.get("current");
    if (!authState?.userId) {
      throw new Error("Cannot create task: userId is not set");
    }
    return authState.userId;
  },
  async insert(task) {
    await db.tasks.add(task);
  },
  async getAll(filter) {
    return db.tasks.filter(filter).toArray();
  },
  async update(id, changes) {
    await db.tasks.update(id, changes);
  },
  async getByIds(ids) {
    return db.tasks.where("id").anyOf(ids).toArray();
  },
  async updateSyncStatus(ids, status) {
    await db.tasks.where("id").anyOf(ids).modify({ _syncStatus: status });
  },
  async bulkUpsertSynced(tasks) {
    await db.tasks.bulkPut(tasks);
  },
};

export const taskRepository = newTaskRepository(
  adapter,
) satisfies TaskRepository;

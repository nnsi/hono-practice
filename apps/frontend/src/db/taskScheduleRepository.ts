import {
  type TaskScheduleDbAdapter,
  type TaskScheduleRepository,
  newTaskScheduleRepository,
} from "@packages/frontend-shared/repositories";

import { db } from "./schema";

const adapter: TaskScheduleDbAdapter = {
  async getUserId() {
    const authState = await db.authState.get("current");
    if (!authState?.userId) {
      throw new Error("Cannot create task schedule: userId is not set");
    }
    return authState.userId;
  },
  async insert(schedule) {
    await db.taskSchedules.add(schedule);
  },
  async getAll(filter) {
    return db.taskSchedules.filter(filter).toArray();
  },
  async update(id, changes) {
    await db.taskSchedules.update(id, changes);
  },
  async getByIds(ids) {
    return db.taskSchedules.where("id").anyOf(ids).toArray();
  },
  async updateSyncStatus(ids, status) {
    await db.taskSchedules
      .where("id")
      .anyOf(ids)
      .modify({ _syncStatus: status });
  },
  async bulkUpsertSynced(schedules) {
    await db.taskSchedules.bulkPut(schedules);
  },
};

export const taskScheduleRepository = newTaskScheduleRepository(
  adapter,
) satisfies TaskScheduleRepository;

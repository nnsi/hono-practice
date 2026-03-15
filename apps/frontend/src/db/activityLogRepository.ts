import type { ActivityLogRepository } from "@packages/domain/activityLog/activityLogRepository";
import {
  type ActivityLogDbAdapter,
  newActivityLogRepository,
} from "@packages/frontend-shared/repositories";

import { db } from "./schema";

const adapter: ActivityLogDbAdapter = {
  async insert(log) {
    await db.activityLogs.add(log);
  },
  async getAll(filter) {
    return db.activityLogs.filter(filter).toArray();
  },
  async getByDate(date) {
    return db.activityLogs
      .where("date")
      .equals(date)
      .filter((log) => log.deletedAt === null)
      .toArray();
  },
  async getByDateRange(startDate, endDate) {
    return db.activityLogs
      .where("date")
      .between(startDate, endDate, true, true)
      .filter((log) => log.deletedAt === null)
      .toArray();
  },
  async update(id, changes) {
    await db.activityLogs.update(id, changes);
  },
  async getByIds(ids) {
    return db.activityLogs.where("id").anyOf(ids).toArray();
  },
  async updateSyncStatus(ids, status) {
    await db.activityLogs
      .where("id")
      .anyOf(ids)
      .modify({ _syncStatus: status });
  },
  async bulkUpsertSynced(logs) {
    await db.activityLogs.bulkPut(logs);
  },
};

export const activityLogRepository = newActivityLogRepository(
  adapter,
) satisfies ActivityLogRepository;

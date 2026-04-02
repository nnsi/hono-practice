import type { ActivityRepository } from "@packages/domain/activity/activityRepository";
import type { ActivityDbAdapter } from "@packages/frontend-shared/repositories";
import { newActivityRepository } from "@packages/frontend-shared/repositories";

import { getDatabase } from "../db/database";
import { dbEvents } from "../db/dbEvents";
import {
  activityBulkAdapterMethods,
  reorderActivitiesInDb,
} from "./activityBulkAdapter";
import { activityIconAdapterMethods } from "./activityIconAdapter";
import {
  type SqlRow,
  activityColumnMap,
  kindColumnMap,
  mapActivityKindRow,
  mapActivityRow,
} from "./activityRowMappers";

const adapter: ActivityDbAdapter = {
  async getUserId() {
    const db = await getDatabase();
    const auth = await db.getFirstAsync<{ user_id: string }>(
      "SELECT user_id FROM auth_state WHERE id = 'current'",
    );
    if (!auth?.user_id) {
      throw new Error("Cannot create activity: userId is not set");
    }
    return auth.user_id;
  },

  async getNextOrderIndex() {
    const db = await getDatabase();
    const last = await db.getFirstAsync<{ order_index: string }>(
      "SELECT order_index FROM activities ORDER BY order_index DESC LIMIT 1",
    );
    return String(Number(last?.order_index ?? "0") + 1).padStart(6, "0");
  },

  async insertActivity(activity) {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO activities (id, user_id, name, label, emoji, icon_type, icon_url, icon_thumbnail_url, description, quantity_unit, order_index, show_combined_stats, recording_mode, recording_mode_config, sync_status, deleted_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        activity.id,
        activity.userId,
        activity.name,
        activity.label,
        activity.emoji,
        activity.iconType,
        activity.iconUrl,
        activity.iconThumbnailUrl,
        activity.description,
        activity.quantityUnit,
        activity.orderIndex,
        activity.showCombinedStats ? 1 : 0,
        activity.recordingMode,
        activity.recordingModeConfig,
        activity._syncStatus,
        activity.deletedAt,
        activity.createdAt,
        activity.updatedAt,
      ],
    );
    dbEvents.emit("activities");
  },

  async getAllActivities() {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SqlRow>(
      "SELECT * FROM activities WHERE deleted_at IS NULL ORDER BY order_index",
    );
    return rows.map(mapActivityRow);
  },

  async getAllActivitiesIncludingDeleted() {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SqlRow>(
      "SELECT * FROM activities ORDER BY order_index",
    );
    return rows.map(mapActivityRow);
  },

  async updateActivity(id, changes) {
    const db = await getDatabase();
    const setClauses: string[] = [];
    const values: (string | number | null)[] = [];
    for (const [key, value] of Object.entries(changes)) {
      const col = activityColumnMap[key];
      if (!col) continue;
      setClauses.push(`${col} = ?`);
      values.push(
        key === "showCombinedStats"
          ? value
            ? 1
            : 0
          : (value as string | number | null),
      );
    }
    if (setClauses.length === 0) return;
    values.push(id);
    await db.runAsync(
      `UPDATE activities SET ${setClauses.join(", ")} WHERE id = ?`,
      values,
    );
    dbEvents.emit("activities");
  },

  async softDeleteActivityAndKinds(id, timestamp) {
    const db = await getDatabase();
    await db.runAsync(
      "UPDATE activities SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?",
      [timestamp, timestamp, id],
    );
    await db.runAsync(
      "UPDATE activity_kinds SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE activity_id = ?",
      [timestamp, timestamp, id],
    );
    dbEvents.emit("activities");
    dbEvents.emit("activity_kinds");
  },

  async insertKinds(kinds) {
    const db = await getDatabase();
    for (const k of kinds) {
      await db.runAsync(
        `INSERT INTO activity_kinds (id, activity_id, name, color, order_index, sync_status, deleted_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          k.id,
          k.activityId,
          k.name,
          k.color,
          k.orderIndex,
          k._syncStatus,
          k.deletedAt,
          k.createdAt,
          k.updatedAt,
        ],
      );
    }
    dbEvents.emit("activity_kinds");
  },

  async getKindsByActivityId(activityId) {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SqlRow>(
      "SELECT * FROM activity_kinds WHERE activity_id = ? AND deleted_at IS NULL ORDER BY order_index",
      [activityId],
    );
    return rows.map(mapActivityKindRow);
  },

  async getAllKinds() {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SqlRow>(
      "SELECT * FROM activity_kinds WHERE deleted_at IS NULL ORDER BY order_index",
    );
    return rows.map(mapActivityKindRow);
  },

  async getAllKindsIncludingDeleted() {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SqlRow>(
      "SELECT * FROM activity_kinds ORDER BY order_index",
    );
    return rows.map(mapActivityKindRow);
  },

  async updateKind(id, changes) {
    const db = await getDatabase();
    const setClauses: string[] = [];
    const values: (string | number | null)[] = [];
    for (const [key, value] of Object.entries(changes)) {
      const col = kindColumnMap[key];
      if (!col) continue;
      setClauses.push(`${col} = ?`);
      values.push(value as string | number | null);
    }
    if (setClauses.length === 0) return;
    values.push(id);
    await db.runAsync(
      `UPDATE activity_kinds SET ${setClauses.join(", ")} WHERE id = ?`,
      values,
    );
    dbEvents.emit("activity_kinds");
  },

  async insertKind(kind) {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO activity_kinds (id, activity_id, name, color, order_index, sync_status, deleted_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        kind.id,
        kind.activityId,
        kind.name,
        kind.color,
        kind.orderIndex,
        kind._syncStatus,
        kind.deletedAt,
        kind.createdAt,
        kind.updatedAt,
      ],
    );
    dbEvents.emit("activity_kinds");
  },

  async reorderActivities(orderedIds) {
    await reorderActivitiesInDb(orderedIds);
  },

  async getPendingSyncActivities() {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SqlRow>(
      "SELECT * FROM activities WHERE sync_status IN ('pending', 'failed')",
    );
    return rows.map(mapActivityRow);
  },

  async getPendingSyncActivityKinds() {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SqlRow>(
      "SELECT * FROM activity_kinds WHERE sync_status IN ('pending', 'failed')",
    );
    return rows.map(mapActivityKindRow);
  },

  ...activityBulkAdapterMethods,
  ...activityIconAdapterMethods,
};

export const activityRepository = newActivityRepository(
  adapter,
) satisfies ActivityRepository;

// Re-exported for tests that import from this module
export { mapActivityKindRow, mapActivityRow } from "./activityRowMappers";

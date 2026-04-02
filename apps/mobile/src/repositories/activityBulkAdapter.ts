import type {
  ActivityKindRecord,
  ActivityRecord,
} from "@packages/domain/activity/activityRecord";
import type {
  SyncStatus,
  Syncable,
} from "@packages/domain/sync/syncableRecord";
import { getServerNowISOString } from "@packages/sync-engine";

import { getDatabase } from "../db/database";
import { dbEvents } from "../db/dbEvents";
import {
  type SqlRow,
  mapActivityKindRow,
  mapActivityRow,
} from "./activityRowMappers";

export const activityBulkAdapterMethods = {
  async updateActivitiesSyncStatus(ids: string[], status: SyncStatus) {
    if (ids.length === 0) return;
    const db = await getDatabase();
    const ph = ids.map(() => "?").join(",");
    await db.runAsync(
      `UPDATE activities SET sync_status = ? WHERE id IN (${ph})`,
      [status, ...ids],
    );
    dbEvents.emit("activities");
  },

  async updateKindsSyncStatus(ids: string[], status: SyncStatus) {
    if (ids.length === 0) return;
    const db = await getDatabase();
    const ph = ids.map(() => "?").join(",");
    await db.runAsync(
      `UPDATE activity_kinds SET sync_status = ? WHERE id IN (${ph})`,
      [status, ...ids],
    );
    dbEvents.emit("activity_kinds");
  },

  async getActivitiesByIds(ids: string[]) {
    if (ids.length === 0) return [];
    const db = await getDatabase();
    const ph = ids.map(() => "?").join(",");
    const rows = await db.getAllAsync<SqlRow>(
      `SELECT * FROM activities WHERE id IN (${ph})`,
      ids,
    );
    return rows.map(mapActivityRow);
  },

  async getKindsByIds(ids: string[]) {
    if (ids.length === 0) return [];
    const db = await getDatabase();
    const ph = ids.map(() => "?").join(",");
    const rows = await db.getAllAsync<SqlRow>(
      `SELECT * FROM activity_kinds WHERE id IN (${ph})`,
      ids,
    );
    return rows.map(mapActivityKindRow);
  },

  async bulkUpsertActivities(activities: Syncable<ActivityRecord>[]) {
    if (activities.length === 0) return;
    const db = await getDatabase();
    try {
      await db.execAsync("BEGIN");
      for (const a of activities) {
        await db.runAsync(
          `INSERT OR REPLACE INTO activities (id, user_id, name, label, emoji, icon_type, icon_url, icon_thumbnail_url, description, quantity_unit, order_index, show_combined_stats, recording_mode, recording_mode_config, sync_status, deleted_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            a.id,
            a.userId,
            a.name,
            a.label,
            a.emoji,
            a.iconType,
            a.iconUrl,
            a.iconThumbnailUrl,
            a.description,
            a.quantityUnit,
            a.orderIndex,
            a.showCombinedStats ? 1 : 0,
            a.recordingMode,
            a.recordingModeConfig,
            a._syncStatus,
            a.deletedAt,
            a.createdAt,
            a.updatedAt,
          ],
        );
      }
      await db.execAsync("COMMIT");
    } catch (e) {
      await db.execAsync("ROLLBACK");
      throw e;
    }
    dbEvents.emit("activities");
  },

  async bulkUpsertKinds(kinds: Syncable<ActivityKindRecord>[]) {
    if (kinds.length === 0) return;
    const db = await getDatabase();
    try {
      await db.execAsync("BEGIN");
      for (const k of kinds) {
        await db.runAsync(
          `INSERT OR REPLACE INTO activity_kinds (id, activity_id, name, color, order_index, sync_status, deleted_at, created_at, updated_at)
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
      await db.execAsync("COMMIT");
    } catch (e) {
      await db.execAsync("ROLLBACK");
      throw e;
    }
    dbEvents.emit("activity_kinds");
  },
};

export async function reorderActivitiesInDb(orderedIds: string[]) {
  const db = await getDatabase();
  const now = getServerNowISOString();
  try {
    await db.execAsync("BEGIN");
    for (let i = 0; i < orderedIds.length; i++) {
      await db.runAsync(
        "UPDATE activities SET order_index = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?",
        [String(i).padStart(6, "0"), now, orderedIds[i]],
      );
    }
    await db.execAsync("COMMIT");
  } catch (e) {
    await db.execAsync("ROLLBACK");
    throw e;
  }
  dbEvents.emit("activities");
}

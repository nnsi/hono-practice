import type { SyncStatus } from "@packages/domain";
import type {
  ActivityKindRecord,
  ActivityRecord,
} from "@packages/domain/activity/activityRecord";
import type { ActivityRepository } from "@packages/domain/activity/activityRepository";
import {
  RECORDING_MODES,
  type RecordingMode,
} from "@packages/domain/activity/recordingMode";
import type { Syncable } from "@packages/domain/sync/syncableRecord";
import {
  type ActivityDbAdapter,
  newActivityRepository,
} from "@packages/frontend-shared/repositories";

import { getDatabase } from "../db/database";
import { dbEvents } from "../db/dbEvents";

// --- Row mapping helpers (snake_case SQL -> camelCase TS) ---

type SqlRow = Record<string, unknown>;

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function strOrNull(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

type IconType = "emoji" | "upload";
const VALID_ICON_TYPES = new Set<string>(["emoji", "upload"]);

function isIconType(v: string): v is IconType {
  return VALID_ICON_TYPES.has(v);
}

function toIconType(v: unknown): IconType {
  if (typeof v === "string" && isIconType(v)) return v;
  return "emoji";
}

const VALID_RECORDING_MODES: ReadonlySet<string> = new Set(RECORDING_MODES);

function isRecordingMode(v: string): v is RecordingMode {
  return VALID_RECORDING_MODES.has(v);
}

function toRecordingMode(v: unknown): RecordingMode {
  if (typeof v === "string" && isRecordingMode(v)) return v;
  return "manual";
}

function toSyncStatus(v: unknown): SyncStatus {
  if (v === "pending" || v === "synced" || v === "failed") return v;
  return "synced";
}

export function mapActivityRow(row: SqlRow): Syncable<ActivityRecord> {
  return {
    id: str(row.id),
    userId: str(row.user_id),
    name: str(row.name),
    label: str(row.label),
    emoji: str(row.emoji),
    iconType: toIconType(row.icon_type),
    iconUrl: strOrNull(row.icon_url),
    iconThumbnailUrl: strOrNull(row.icon_thumbnail_url),
    description: str(row.description),
    quantityUnit: str(row.quantity_unit),
    orderIndex: str(row.order_index),
    showCombinedStats: row.show_combined_stats === 1,
    recordingMode: toRecordingMode(row.recording_mode),
    recordingModeConfig: strOrNull(row.recording_mode_config),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
    deletedAt: strOrNull(row.deleted_at),
    _syncStatus: toSyncStatus(row.sync_status),
  };
}

export function mapActivityKindRow(row: SqlRow): Syncable<ActivityKindRecord> {
  return {
    id: str(row.id),
    activityId: str(row.activity_id),
    name: str(row.name),
    color: strOrNull(row.color),
    orderIndex: str(row.order_index),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
    deletedAt: strOrNull(row.deleted_at),
    _syncStatus: toSyncStatus(row.sync_status),
  };
}

// --- Adapter ---

const activityColumnMap: Record<string, string> = {
  name: "name",
  label: "label",
  emoji: "emoji",
  iconType: "icon_type",
  iconUrl: "icon_url",
  iconThumbnailUrl: "icon_thumbnail_url",
  description: "description",
  quantityUnit: "quantity_unit",
  orderIndex: "order_index",
  showCombinedStats: "show_combined_stats",
  recordingMode: "recording_mode",
  recordingModeConfig: "recording_mode_config",
  updatedAt: "updated_at",
  _syncStatus: "sync_status",
  deletedAt: "deleted_at",
};

const kindColumnMap: Record<string, string> = {
  name: "name",
  color: "color",
  orderIndex: "order_index",
  updatedAt: "updated_at",
  _syncStatus: "sync_status",
  deletedAt: "deleted_at",
};

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

  async updateActivity(id, changes) {
    const db = await getDatabase();
    const setClauses: string[] = [];
    const values: (string | number | null)[] = [];

    for (const [key, value] of Object.entries(changes)) {
      const col = activityColumnMap[key];
      if (!col) continue;
      if (key === "showCombinedStats") {
        setClauses.push(`${col} = ?`);
        values.push(value ? 1 : 0);
      } else {
        setClauses.push(`${col} = ?`);
        values.push(value as string | number | null);
      }
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
    const db = await getDatabase();
    const now = new Date().toISOString();
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
  },

  async getPendingSyncActivities() {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SqlRow>(
      "SELECT * FROM activities WHERE sync_status = 'pending'",
    );
    return rows.map(mapActivityRow);
  },

  async getPendingSyncActivityKinds() {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SqlRow>(
      "SELECT * FROM activity_kinds WHERE sync_status = 'pending'",
    );
    return rows.map(mapActivityKindRow);
  },

  async updateActivitiesSyncStatus(ids, status) {
    if (ids.length === 0) return;
    const db = await getDatabase();
    const placeholders = ids.map(() => "?").join(",");
    await db.runAsync(
      `UPDATE activities SET sync_status = ? WHERE id IN (${placeholders})`,
      [status, ...ids],
    );
    dbEvents.emit("activities");
  },

  async updateKindsSyncStatus(ids, status) {
    if (ids.length === 0) return;
    const db = await getDatabase();
    const placeholders = ids.map(() => "?").join(",");
    await db.runAsync(
      `UPDATE activity_kinds SET sync_status = ? WHERE id IN (${placeholders})`,
      [status, ...ids],
    );
    dbEvents.emit("activity_kinds");
  },

  async getActivitiesByIds(ids) {
    if (ids.length === 0) return [];
    const db = await getDatabase();
    const placeholders = ids.map(() => "?").join(",");
    const rows = await db.getAllAsync<SqlRow>(
      `SELECT * FROM activities WHERE id IN (${placeholders})`,
      ids,
    );
    return rows.map(mapActivityRow);
  },

  async getKindsByIds(ids) {
    if (ids.length === 0) return [];
    const db = await getDatabase();
    const placeholders = ids.map(() => "?").join(",");
    const rows = await db.getAllAsync<SqlRow>(
      `SELECT * FROM activity_kinds WHERE id IN (${placeholders})`,
      ids,
    );
    return rows.map(mapActivityKindRow);
  },

  async bulkUpsertActivities(activities) {
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

  async bulkUpsertKinds(kinds) {
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

  // --- Icon blob management (passthrough) ---

  async saveActivityIconBlob(activityId, base64, mimeType) {
    const db = await getDatabase();
    await db.runAsync(
      "INSERT OR REPLACE INTO activity_icon_blobs (activity_id, base64, mime_type) VALUES (?, ?, ?)",
      [activityId, base64, mimeType],
    );
  },

  async getActivityIconBlob(activityId) {
    const db = await getDatabase();
    const row = await db.getFirstAsync<SqlRow>(
      "SELECT * FROM activity_icon_blobs WHERE activity_id = ?",
      [activityId],
    );
    if (!row) return undefined;
    return {
      activityId: str(row.activity_id),
      base64: str(row.base64),
      mimeType: str(row.mime_type),
    };
  },

  async deleteActivityIconBlob(activityId) {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM activity_icon_blobs WHERE activity_id = ?", [
      activityId,
    ]);
  },

  async getAllIconBlobs() {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SqlRow>(
      "SELECT * FROM activity_icon_blobs",
    );
    return rows.map((row) => ({
      activityId: str(row.activity_id),
      base64: str(row.base64),
      mimeType: str(row.mime_type),
    }));
  },

  async getPendingIconBlobs() {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SqlRow>(
      "SELECT * FROM activity_icon_blobs WHERE synced = 0 OR synced IS NULL",
    );
    return rows.map((row) => ({
      activityId: str(row.activity_id),
      base64: str(row.base64),
      mimeType: str(row.mime_type),
    }));
  },

  async completeActivityIconSync(activityId, iconUrl, iconThumbnailUrl) {
    const db = await getDatabase();
    try {
      await db.execAsync("BEGIN");
      await db.runAsync(
        "UPDATE activities SET icon_url = ?, icon_thumbnail_url = ?, sync_status = 'pending' WHERE id = ?",
        [iconUrl, iconThumbnailUrl, activityId],
      );
      await db.runAsync(
        "UPDATE activity_icon_blobs SET synced = 1 WHERE activity_id = ?",
        [activityId],
      );
      await db.execAsync("COMMIT");
    } catch (e) {
      await db.execAsync("ROLLBACK");
      throw e;
    }
    dbEvents.emit("activities");
    dbEvents.emit("activity_icon_blobs");
  },

  async clearActivityIcon(activityId) {
    const db = await getDatabase();
    const now = new Date().toISOString();
    try {
      await db.execAsync("BEGIN");
      await db.runAsync(
        "UPDATE activities SET icon_type = 'emoji', icon_url = NULL, icon_thumbnail_url = NULL, updated_at = ?, sync_status = 'pending' WHERE id = ?",
        [now, activityId],
      );
      await db.runAsync(
        "DELETE FROM activity_icon_blobs WHERE activity_id = ?",
        [activityId],
      );
      await db.runAsync(
        "INSERT OR REPLACE INTO activity_icon_delete_queue (activity_id) VALUES (?)",
        [activityId],
      );
      await db.execAsync("COMMIT");
    } catch (e) {
      await db.execAsync("ROLLBACK");
      throw e;
    }
    dbEvents.emit("activities");
  },

  async getPendingIconDeletes() {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SqlRow>(
      "SELECT * FROM activity_icon_delete_queue",
    );
    return rows.map((row) => ({
      activityId: str(row.activity_id),
    }));
  },

  async removeIconDeleteQueue(activityId) {
    const db = await getDatabase();
    await db.runAsync(
      "DELETE FROM activity_icon_delete_queue WHERE activity_id = ?",
      [activityId],
    );
  },

  async cacheRemoteIcon(activityId, url) {
    const db = await getDatabase();
    const existing = await db.getFirstAsync<SqlRow>(
      "SELECT activity_id FROM activity_icon_blobs WHERE activity_id = ?",
      [activityId],
    );
    if (existing) return;
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const contentType = res.headers.get("content-type") || "image/webp";
      const arrayBuffer = await res.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      await db.runAsync(
        "INSERT OR REPLACE INTO activity_icon_blobs (activity_id, base64, mime_type, synced) VALUES (?, ?, ?, 1)",
        [activityId, base64, contentType],
      );
      dbEvents.emit("activity_icon_blobs");
    } catch {
      // Network error -- URL表示のフォールバックがあるため無視
    }
  },
};

export const activityRepository = newActivityRepository(
  adapter,
) satisfies ActivityRepository;

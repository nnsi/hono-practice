import type { SyncStatus } from "@packages/domain";
import type {
  ActivityKindRecord,
  ActivityRecord,
} from "@packages/domain/activity/activityRecord";
import type { ActivityRepository } from "@packages/domain/activity/activityRepository";
import { v7 as uuidv7 } from "uuid";

import { getDatabase } from "../db/database";
import { dbEvents } from "../db/dbEvents";

// --- Row mapping helpers (snake_case SQL → camelCase TS) ---

type SqlRow = Record<string, unknown>;

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function strOrNull(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

type IconType = "emoji" | "upload";
const VALID_ICON_TYPES = new Set<string>(["emoji", "upload"]);

function toIconType(v: unknown): IconType {
  if (typeof v === "string" && VALID_ICON_TYPES.has(v)) return v as IconType;
  return "emoji";
}

type ActivityWithSync = ActivityRecord & { _syncStatus: SyncStatus };
type ActivityKindWithSync = ActivityKindRecord & { _syncStatus: SyncStatus };

function toSyncStatus(v: unknown): SyncStatus {
  if (v === "pending" || v === "synced" || v === "failed") return v;
  return "synced";
}

export function mapActivityRow(row: SqlRow): ActivityWithSync {
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
    recordingMode: str(row.recording_mode) || "manual",
    recordingModeConfig: strOrNull(row.recording_mode_config),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
    deletedAt: strOrNull(row.deleted_at),
    _syncStatus: toSyncStatus(row.sync_status),
  };
}

export function mapActivityKindRow(row: SqlRow): ActivityKindWithSync {
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

// --- Icon blob types ---

type IconBlob = {
  activityId: string;
  base64: string;
  mimeType: string;
};

type IconDeleteEntry = {
  activityId: string;
};

// --- Repository ---

type CreateActivityInput = {
  name: string;
  quantityUnit: string;
  emoji: string;
  showCombinedStats: boolean;
  iconType?: "emoji" | "upload";
  recordingMode?: string;
  recordingModeConfig?: string | null;
  kinds?: Array<{ name: string; color: string }>;
};

export const activityRepository = {
  // --- Read ---

  async getAllActivities(): Promise<ActivityWithSync[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SqlRow>(
      "SELECT * FROM activities WHERE deleted_at IS NULL ORDER BY order_index",
    );
    return rows.map(mapActivityRow);
  },

  async getActivityKindsByActivityId(
    activityId: string,
  ): Promise<ActivityKindWithSync[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SqlRow>(
      "SELECT * FROM activity_kinds WHERE activity_id = ? AND deleted_at IS NULL ORDER BY order_index",
      [activityId],
    );
    return rows.map(mapActivityKindRow);
  },

  async getAllActivityKinds(): Promise<ActivityKindWithSync[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SqlRow>(
      "SELECT * FROM activity_kinds WHERE deleted_at IS NULL ORDER BY order_index",
    );
    return rows.map(mapActivityKindRow);
  },

  // --- Create ---

  async createActivity(input: CreateActivityInput) {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const id = uuidv7();

    const auth = await db.getFirstAsync<{ user_id: string }>(
      "SELECT user_id FROM auth_state WHERE id = 'current'",
    );
    if (!auth?.user_id) {
      throw new Error("Cannot create activity: userId is not set");
    }
    const lastActivity = await db.getFirstAsync<{ order_index: string }>(
      "SELECT order_index FROM activities ORDER BY order_index DESC LIMIT 1",
    );
    const newIndex = String(
      Number(lastActivity?.order_index ?? "0") + 1,
    ).padStart(6, "0");

    await db.runAsync(
      `INSERT INTO activities (id, user_id, name, label, emoji, icon_type, icon_url, icon_thumbnail_url, description, quantity_unit, order_index, show_combined_stats, recording_mode, recording_mode_config, sync_status, deleted_at, created_at, updated_at)
       VALUES (?, ?, ?, '', ?, ?, NULL, NULL, '', ?, ?, ?, ?, ?, 'pending', NULL, ?, ?)`,
      [
        id,
        auth.user_id,
        input.name,
        input.emoji,
        input.iconType ?? "emoji",
        input.quantityUnit,
        newIndex,
        input.showCombinedStats ? 1 : 0,
        input.recordingMode ?? "manual",
        input.recordingModeConfig ?? null,
        now,
        now,
      ],
    );

    if (input.kinds && input.kinds.length > 0) {
      for (let i = 0; i < input.kinds.length; i++) {
        const kind = input.kinds[i];
        const kindId = uuidv7();
        const kindIndex = String(i).padStart(6, "0");
        await db.runAsync(
          `INSERT INTO activity_kinds (id, activity_id, name, color, order_index, sync_status, deleted_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 'pending', NULL, ?, ?)`,
          [kindId, id, kind.name, kind.color || null, kindIndex, now, now],
        );
      }
    }

    dbEvents.emit("activities");
    dbEvents.emit("activity_kinds");

    return {
      id,
      userId: auth.user_id,
      name: input.name,
      label: "",
      emoji: input.emoji,
      iconType: (input.iconType ?? "emoji") as ActivityRecord["iconType"],
      iconUrl: null,
      iconThumbnailUrl: null,
      description: "",
      quantityUnit: input.quantityUnit,
      orderIndex: newIndex,
      showCombinedStats: input.showCombinedStats,
      recordingMode: input.recordingMode ?? "manual",
      recordingModeConfig: input.recordingModeConfig ?? null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      _syncStatus: "pending" as const,
    };
  },

  // --- Update ---

  async updateActivity(
    id: string,
    changes: Partial<
      Pick<
        ActivityRecord,
        | "name"
        | "quantityUnit"
        | "emoji"
        | "showCombinedStats"
        | "iconType"
        | "recordingMode"
        | "recordingModeConfig"
      >
    >,
    updatedKinds?: Array<{ id?: string; name: string; color: string }>,
  ): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    // Build dynamic SET clause for activity
    const setClauses: string[] = ["updated_at = ?", "sync_status = 'pending'"];
    const setValues: (string | number | null)[] = [now];

    if (changes.name !== undefined) {
      setClauses.push("name = ?");
      setValues.push(changes.name);
    }
    if (changes.quantityUnit !== undefined) {
      setClauses.push("quantity_unit = ?");
      setValues.push(changes.quantityUnit);
    }
    if (changes.emoji !== undefined) {
      setClauses.push("emoji = ?");
      setValues.push(changes.emoji);
    }
    if (changes.showCombinedStats !== undefined) {
      setClauses.push("show_combined_stats = ?");
      setValues.push(changes.showCombinedStats ? 1 : 0);
    }
    if (changes.iconType !== undefined) {
      setClauses.push("icon_type = ?");
      setValues.push(changes.iconType);
    }
    if (changes.recordingMode !== undefined) {
      setClauses.push("recording_mode = ?");
      setValues.push(changes.recordingMode);
    }
    if (changes.recordingModeConfig !== undefined) {
      setClauses.push("recording_mode_config = ?");
      setValues.push(changes.recordingModeConfig ?? null);
    }

    setValues.push(id);
    await db.runAsync(
      `UPDATE activities SET ${setClauses.join(", ")} WHERE id = ?`,
      setValues,
    );

    if (updatedKinds !== undefined) {
      // Get existing non-deleted kinds for this activity
      const existing = await db.getAllAsync<SqlRow>(
        "SELECT id FROM activity_kinds WHERE activity_id = ? AND deleted_at IS NULL",
        [id],
      );
      const existingIds = existing.map((r: SqlRow) => str(r.id));
      const updatedIdSet = new Set(
        updatedKinds.filter((k) => k.id).map((k) => k.id!),
      );

      // Soft-delete removed kinds
      for (const existingId of existingIds) {
        if (!updatedIdSet.has(existingId)) {
          await db.runAsync(
            "UPDATE activity_kinds SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?",
            [now, now, existingId],
          );
        }
      }

      // Update existing and add new kinds
      for (let i = 0; i < updatedKinds.length; i++) {
        const kind = updatedKinds[i];
        const kindIndex = String(i).padStart(6, "0");
        if (kind.id) {
          await db.runAsync(
            "UPDATE activity_kinds SET name = ?, color = ?, order_index = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?",
            [kind.name, kind.color || null, kindIndex, now, kind.id],
          );
        } else {
          const kindId = uuidv7();
          await db.runAsync(
            `INSERT INTO activity_kinds (id, activity_id, name, color, order_index, sync_status, deleted_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, 'pending', NULL, ?, ?)`,
            [kindId, id, kind.name, kind.color || null, kindIndex, now, now],
          );
        }
      }
    }

    dbEvents.emit("activities");
    dbEvents.emit("activity_kinds");
  },

  // --- Reorder ---

  async reorderActivities(orderedIds: string[]): Promise<void> {
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

  // --- Delete ---

  async softDeleteActivity(id: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    await db.runAsync(
      "UPDATE activities SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?",
      [now, now, id],
    );
    await db.runAsync(
      "UPDATE activity_kinds SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE activity_id = ?",
      [now, now, id],
    );

    dbEvents.emit("activities");
    dbEvents.emit("activity_kinds");
  },

  // --- Sync helpers ---

  async getPendingSyncActivities(): Promise<ActivityWithSync[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SqlRow>(
      "SELECT * FROM activities WHERE sync_status = 'pending'",
    );
    return rows.map(mapActivityRow);
  },

  async getPendingSyncActivityKinds(): Promise<ActivityKindWithSync[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SqlRow>(
      "SELECT * FROM activity_kinds WHERE sync_status = 'pending'",
    );
    return rows.map(mapActivityKindRow);
  },

  async markActivitiesSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const db = await getDatabase();
    const placeholders = ids.map(() => "?").join(",");
    await db.runAsync(
      `UPDATE activities SET sync_status = 'synced' WHERE id IN (${placeholders})`,
      ids,
    );
    dbEvents.emit("activities");
  },

  async markActivityKindsSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const db = await getDatabase();
    const placeholders = ids.map(() => "?").join(",");
    await db.runAsync(
      `UPDATE activity_kinds SET sync_status = 'synced' WHERE id IN (${placeholders})`,
      ids,
    );
    dbEvents.emit("activity_kinds");
  },

  async markActivitiesFailed(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const db = await getDatabase();
    const placeholders = ids.map(() => "?").join(",");
    await db.runAsync(
      `UPDATE activities SET sync_status = 'failed' WHERE id IN (${placeholders})`,
      ids,
    );
    dbEvents.emit("activities");
  },

  async markActivityKindsFailed(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const db = await getDatabase();
    const placeholders = ids.map(() => "?").join(",");
    await db.runAsync(
      `UPDATE activity_kinds SET sync_status = 'failed' WHERE id IN (${placeholders})`,
      ids,
    );
    dbEvents.emit("activity_kinds");
  },

  // --- Icon blob management ---

  async saveActivityIconBlob(
    activityId: string,
    base64: string,
    mimeType: string,
  ): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      "INSERT OR REPLACE INTO activity_icon_blobs (activity_id, base64, mime_type) VALUES (?, ?, ?)",
      [activityId, base64, mimeType],
    );
  },

  async getActivityIconBlob(activityId: string): Promise<IconBlob | undefined> {
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

  async deleteActivityIconBlob(activityId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM activity_icon_blobs WHERE activity_id = ?", [
      activityId,
    ]);
  },

  async getAllIconBlobs(): Promise<IconBlob[]> {
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

  async getPendingIconBlobs(): Promise<IconBlob[]> {
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

  async completeActivityIconSync(
    activityId: string,
    iconUrl: string,
    iconThumbnailUrl: string,
  ): Promise<void> {
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

  async clearActivityIcon(activityId: string): Promise<void> {
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

  async getPendingIconDeletes(): Promise<IconDeleteEntry[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SqlRow>(
      "SELECT * FROM activity_icon_delete_queue",
    );
    return rows.map((row) => ({
      activityId: str(row.activity_id),
    }));
  },

  async removeIconDeleteQueue(activityId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      "DELETE FROM activity_icon_delete_queue WHERE activity_id = ?",
      [activityId],
    );
  },

  async cacheRemoteIcon(activityId: string, url: string): Promise<void> {
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
      // Network error — URL表示のフォールバックがあるため無視
    }
  },

  // --- Server upsert (for initial sync and sync engine) ---

  async upsertActivities(activities: ActivityRecord[]): Promise<void> {
    const db = await getDatabase();
    try {
      await db.execAsync("BEGIN");
      for (const a of activities) {
        await db.runAsync(
          `INSERT INTO activities (id, user_id, name, label, emoji, icon_type, icon_url, icon_thumbnail_url, description, quantity_unit, order_index, show_combined_stats, recording_mode, recording_mode_config, sync_status, deleted_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             user_id = excluded.user_id,
             name = excluded.name,
             label = excluded.label,
             emoji = excluded.emoji,
             icon_type = excluded.icon_type,
             icon_url = excluded.icon_url,
             icon_thumbnail_url = excluded.icon_thumbnail_url,
             description = excluded.description,
             quantity_unit = excluded.quantity_unit,
             order_index = excluded.order_index,
             show_combined_stats = excluded.show_combined_stats,
             recording_mode = excluded.recording_mode,
             recording_mode_config = excluded.recording_mode_config,
             sync_status = 'synced',
             deleted_at = excluded.deleted_at,
             created_at = excluded.created_at,
             updated_at = excluded.updated_at
           WHERE sync_status <> 'pending'
             AND updated_at <= excluded.updated_at`,
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

  async upsertActivityKinds(kinds: ActivityKindRecord[]): Promise<void> {
    const db = await getDatabase();
    try {
      await db.execAsync("BEGIN");
      for (const k of kinds) {
        await db.runAsync(
          `INSERT INTO activity_kinds (id, activity_id, name, color, order_index, sync_status, deleted_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 'synced', ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             activity_id = excluded.activity_id,
             name = excluded.name,
             color = excluded.color,
             order_index = excluded.order_index,
             sync_status = 'synced',
             deleted_at = excluded.deleted_at,
             created_at = excluded.created_at,
             updated_at = excluded.updated_at
           WHERE sync_status <> 'pending'
             AND updated_at <= excluded.updated_at`,
          [
            k.id,
            k.activityId,
            k.name,
            k.color,
            k.orderIndex,
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
} satisfies ActivityRepository;

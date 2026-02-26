import type {
  ActivityRecord,
  ActivityKindRecord,
} from "@packages/domain/activity/activityRecord";
import { getDatabase } from "../db/database";
import { dbEvents } from "../db/dbEvents";
import { v7 as uuidv7 } from "uuid";

// --- Row mapping helpers (snake_case SQL → camelCase TS) ---

type SqlRow = Record<string, unknown>;

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function strOrNull(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

type IconType = "emoji" | "upload" | "generate";
const VALID_ICON_TYPES = new Set<string>(["emoji", "upload", "generate"]);

function toIconType(v: unknown): IconType {
  if (typeof v === "string" && VALID_ICON_TYPES.has(v)) return v as IconType;
  return "emoji";
}

type ActivityWithSync = ActivityRecord & { _syncStatus: string };
type ActivityKindWithSync = ActivityKindRecord & { _syncStatus: string };

function mapActivityRow(row: SqlRow): ActivityWithSync {
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
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
    deletedAt: strOrNull(row.deleted_at),
    _syncStatus: str(row.sync_status),
  };
}

function mapActivityKindRow(row: SqlRow): ActivityKindWithSync {
  return {
    id: str(row.id),
    activityId: str(row.activity_id),
    name: str(row.name),
    color: strOrNull(row.color),
    orderIndex: str(row.order_index),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
    deletedAt: strOrNull(row.deleted_at),
    _syncStatus: str(row.sync_status),
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
  iconType?: string;
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
    const lastActivity = await db.getFirstAsync<{ order_index: string }>(
      "SELECT order_index FROM activities ORDER BY order_index DESC LIMIT 1",
    );
    const newIndex = String(Number(lastActivity?.order_index ?? "0") + 1).padStart(6, "0");

    await db.runAsync(
      `INSERT INTO activities (id, user_id, name, label, emoji, icon_type, icon_url, icon_thumbnail_url, description, quantity_unit, order_index, show_combined_stats, sync_status, deleted_at, created_at, updated_at)
       VALUES (?, ?, ?, '', ?, ?, NULL, NULL, '', ?, ?, ?, 'pending', NULL, ?, ?)`,
      [
        id,
        auth?.user_id ?? "",
        input.name,
        input.emoji,
        input.iconType ?? "emoji",
        input.quantityUnit,
        newIndex,
        input.showCombinedStats ? 1 : 0,
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
      userId: auth?.user_id ?? "",
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
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      _syncStatus: "pending",
    };
  },

  // --- Update ---

  async updateActivity(
    id: string,
    changes: Partial<
      Pick<
        ActivityRecord,
        "name" | "quantityUnit" | "emoji" | "showCombinedStats" | "iconType"
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

  async getActivityIconBlob(activityId: string): Promise<IconBlob | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<SqlRow>(
      "SELECT * FROM activity_icon_blobs WHERE activity_id = ?",
      [activityId],
    );
    if (!row) return null;
    return {
      activityId: str(row.activity_id),
      base64: str(row.base64),
      mimeType: str(row.mime_type),
    };
  },

  async deleteActivityIconBlob(activityId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      "DELETE FROM activity_icon_blobs WHERE activity_id = ?",
      [activityId],
    );
  },

  async getPendingIconBlobs(): Promise<IconBlob[]> {
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

  async completeActivityIconSync(
    activityId: string,
    iconUrl: string,
    iconThumbnailUrl: string,
  ): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      "UPDATE activities SET icon_url = ?, icon_thumbnail_url = ?, sync_status = 'pending' WHERE id = ?",
      [iconUrl, iconThumbnailUrl, activityId],
    );
    await db.runAsync(
      "DELETE FROM activity_icon_blobs WHERE activity_id = ?",
      [activityId],
    );
    dbEvents.emit("activities");
  },

  async clearActivityIcon(activityId: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();

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

  // --- Server upsert (for initial sync and sync engine) ---

  async upsertActivities(activities: ActivityRecord[]): Promise<void> {
    const db = await getDatabase();
    for (const a of activities) {
      await db.runAsync(
        `INSERT OR REPLACE INTO activities (id, user_id, name, label, emoji, icon_type, icon_url, icon_thumbnail_url, description, quantity_unit, order_index, show_combined_stats, sync_status, deleted_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?, ?)`,
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
          a.deletedAt,
          a.createdAt,
          a.updatedAt,
        ],
      );
    }
    dbEvents.emit("activities");
  },

  async upsertActivityKinds(kinds: ActivityKindRecord[]): Promise<void> {
    const db = await getDatabase();
    for (const k of kinds) {
      await db.runAsync(
        `INSERT OR REPLACE INTO activity_kinds (id, activity_id, name, color, order_index, sync_status, deleted_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'synced', ?, ?, ?)`,
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
    dbEvents.emit("activity_kinds");
  },
};

import { getServerNowISOString } from "@packages/sync-engine";

import { getDatabase } from "../db/database";
import { dbEvents } from "../db/dbEvents";
import { type SqlRow, str } from "./activityRowMappers";

export const activityIconAdapterMethods = {
  async saveActivityIconBlob(
    activityId: string,
    base64: string,
    mimeType: string,
  ) {
    const db = await getDatabase();
    await db.runAsync(
      "INSERT OR REPLACE INTO activity_icon_blobs (activity_id, base64, mime_type) VALUES (?, ?, ?)",
      [activityId, base64, mimeType],
    );
    dbEvents.emit("activity_icon_blobs");
  },

  async getActivityIconBlob(activityId: string) {
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

  async deleteActivityIconBlob(activityId: string) {
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

  async completeActivityIconSync(
    activityId: string,
    iconUrl: string,
    iconThumbnailUrl: string,
  ) {
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

  async clearActivityIcon(activityId: string) {
    const db = await getDatabase();
    const now = getServerNowISOString();
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
    return rows.map((row) => ({ activityId: str(row.activity_id) }));
  },

  async removeIconDeleteQueue(activityId: string) {
    const db = await getDatabase();
    await db.runAsync(
      "DELETE FROM activity_icon_delete_queue WHERE activity_id = ?",
      [activityId],
    );
  },

  async cacheRemoteIcon(activityId: string, url: string) {
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

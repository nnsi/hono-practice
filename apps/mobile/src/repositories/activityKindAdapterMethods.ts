import type { ActivityDbAdapter } from "@packages/frontend-shared/repositories";

import { getDatabase } from "../db/database";
import { dbEvents } from "../db/dbEvents";
import { toSqlBindable } from "./sqlRowHelpers";
import {
  type SqlRow,
  kindColumnMap,
  mapActivityKindRow,
} from "./activityRowMappers";

type KindMethods = Pick<
  ActivityDbAdapter,
  | "insertKinds"
  | "getKindsByActivityId"
  | "getAllKinds"
  | "getAllKindsIncludingDeleted"
  | "updateKind"
  | "insertKind"
>;

export const activityKindAdapterMethods: KindMethods = {
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
      values.push(toSqlBindable(value));
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
};

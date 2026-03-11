import type { ActivityRepository } from "@packages/domain/activity/activityRepository";
import { generateOrder } from "@packages/utils/lexicalOrder";
import { v7 as uuidv7 } from "uuid";

import { type DexieActivity, type DexieActivityKind, db } from "./schema";

type CreateActivityInput = {
  name: string;
  quantityUnit: string;
  emoji: string;
  showCombinedStats: boolean;
  iconType?: "emoji" | "upload";
  kinds?: { name: string; color: string }[];
  recordingMode?: string;
  recordingModeConfig?: string | null;
};

export const activityRepository = {
  // Read
  async getAllActivities() {
    return db.activities
      .orderBy("orderIndex")
      .filter((a) => !a.deletedAt)
      .toArray();
  },

  async getActivityKindsByActivityId(activityId: string) {
    return db.activityKinds
      .where("activityId")
      .equals(activityId)
      .filter((k) => !k.deletedAt)
      .toArray();
  },

  async getAllActivityKinds() {
    return db.activityKinds.filter((k) => !k.deletedAt).toArray();
  },

  // Create
  async createActivity(input: CreateActivityInput) {
    const now = new Date().toISOString();
    const authState = await db.authState.get("current");
    if (!authState?.userId) {
      throw new Error("Cannot create activity: userId is not set");
    }
    const lastActivity = await db.activities
      .orderBy("orderIndex")
      .reverse()
      .first();
    const newIndex = generateOrder(lastActivity?.orderIndex ?? null, null);

    const activity: DexieActivity = {
      id: uuidv7(),
      userId: authState.userId,
      name: input.name,
      label: "",
      emoji: input.emoji,
      iconType: input.iconType ?? "emoji",
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
      _syncStatus: "pending",
    };

    await db.activities.add(activity);

    if (input.kinds && input.kinds.length > 0) {
      const kinds: DexieActivityKind[] = input.kinds.map((k, i) => ({
        id: uuidv7(),
        activityId: activity.id,
        name: k.name,
        color: k.color || null,
        orderIndex: String(i).padStart(6, "0"),
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        _syncStatus: "pending" as const,
      }));
      await db.activityKinds.bulkAdd(kinds);
    }

    return activity;
  },

  // Update
  async updateActivity(
    id: string,
    changes: Partial<
      Pick<
        DexieActivity,
        | "name"
        | "quantityUnit"
        | "emoji"
        | "showCombinedStats"
        | "iconType"
        | "recordingMode"
        | "recordingModeConfig"
      >
    >,
    updatedKinds?: { id?: string; name: string; color: string }[],
  ) {
    const now = new Date().toISOString();
    await db.activities.update(id, {
      ...changes,
      updatedAt: now,
      _syncStatus: "pending",
    });

    if (updatedKinds !== undefined) {
      const existing = await db.activityKinds
        .where("activityId")
        .equals(id)
        .filter((k) => !k.deletedAt)
        .toArray();

      const updatedIds = new Set(
        updatedKinds.filter((k) => k.id).map((k) => k.id!),
      );

      // Soft-delete removed kinds
      for (const existingKind of existing) {
        if (!updatedIds.has(existingKind.id)) {
          await db.activityKinds.update(existingKind.id, {
            deletedAt: now,
            updatedAt: now,
            _syncStatus: "pending",
          });
        }
      }

      // Update existing and add new kinds
      for (let i = 0; i < updatedKinds.length; i++) {
        const kind = updatedKinds[i];
        if (kind.id) {
          await db.activityKinds.update(kind.id, {
            name: kind.name,
            color: kind.color || null,
            orderIndex: String(i).padStart(6, "0"),
            updatedAt: now,
            _syncStatus: "pending",
          });
        } else {
          const newKind: DexieActivityKind = {
            id: uuidv7(),
            activityId: id,
            name: kind.name,
            color: kind.color || null,
            orderIndex: String(i).padStart(6, "0"),
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
            _syncStatus: "pending",
          };
          await db.activityKinds.add(newKind);
        }
      }
    }
  },

  // Reorder
  async reorderActivities(orderedIds: string[]) {
    const now = new Date().toISOString();
    await db.transaction("rw", db.activities, async () => {
      let prev: string | null = null;
      for (const id of orderedIds) {
        const orderIndex = generateOrder(prev, null);
        await db.activities.update(id, {
          orderIndex,
          updatedAt: now,
          _syncStatus: "pending" as const,
        });
        prev = orderIndex;
      }
    });
  },

  // Delete
  async softDeleteActivity(id: string) {
    const now = new Date().toISOString();
    await db.activities.update(id, {
      deletedAt: now,
      updatedAt: now,
      _syncStatus: "pending",
    });
    await db.activityKinds
      .where("activityId")
      .equals(id)
      .modify({
        deletedAt: now,
        updatedAt: now,
        _syncStatus: "pending" as const,
      });
  },

  // Sync helpers
  async getPendingSyncActivities() {
    return db.activities.where("_syncStatus").equals("pending").toArray();
  },

  async getPendingSyncActivityKinds() {
    return db.activityKinds.where("_syncStatus").equals("pending").toArray();
  },

  async markActivitiesSynced(ids: string[]) {
    if (ids.length === 0) return;
    await db.activities
      .where("id")
      .anyOf(ids)
      .modify({ _syncStatus: "synced" as const });
  },

  async markActivityKindsSynced(ids: string[]) {
    if (ids.length === 0) return;
    await db.activityKinds
      .where("id")
      .anyOf(ids)
      .modify({ _syncStatus: "synced" as const });
  },

  async markActivitiesFailed(ids: string[]) {
    if (ids.length === 0) return;
    await db.activities
      .where("id")
      .anyOf(ids)
      .modify({ _syncStatus: "failed" as const });
  },

  async markActivityKindsFailed(ids: string[]) {
    if (ids.length === 0) return;
    await db.activityKinds
      .where("id")
      .anyOf(ids)
      .modify({ _syncStatus: "failed" as const });
  },

  // Icon blob management
  async saveActivityIconBlob(
    activityId: string,
    base64: string,
    mimeType: string,
  ) {
    await db.activityIconBlobs.put({ activityId, base64, mimeType });
  },

  async getActivityIconBlob(activityId: string) {
    return db.activityIconBlobs.get(activityId);
  },

  async deleteActivityIconBlob(activityId: string) {
    await db.activityIconBlobs.delete(activityId);
  },

  async getAllIconBlobs() {
    return db.activityIconBlobs.toArray();
  },

  async getPendingIconBlobs() {
    const all = await db.activityIconBlobs.toArray();
    return all.filter((b) => !b.synced);
  },

  async completeActivityIconSync(
    activityId: string,
    iconUrl: string,
    iconThumbnailUrl: string,
  ) {
    await db.transaction(
      "rw",
      [db.activities, db.activityIconBlobs],
      async () => {
        await db.activities.update(activityId, {
          iconUrl,
          iconThumbnailUrl,
          _syncStatus: "pending" as const,
        });
        await db.activityIconBlobs.update(activityId, { synced: true });
      },
    );
  },

  async clearActivityIcon(activityId: string) {
    const now = new Date().toISOString();
    await db.transaction(
      "rw",
      [db.activities, db.activityIconBlobs, db.activityIconDeleteQueue],
      async () => {
        await db.activities.update(activityId, {
          iconType: "emoji" as const,
          iconUrl: null,
          iconThumbnailUrl: null,
          updatedAt: now,
          _syncStatus: "pending" as const,
        });
        await db.activityIconBlobs.delete(activityId);
        await db.activityIconDeleteQueue.put({ activityId });
      },
    );
  },

  async getPendingIconDeletes() {
    return db.activityIconDeleteQueue.toArray();
  },

  async removeIconDeleteQueue(activityId: string) {
    await db.activityIconDeleteQueue.delete(activityId);
  },

  async cacheRemoteIcon(activityId: string, url: string) {
    const existing = await db.activityIconBlobs.get(activityId);
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
      await db.activityIconBlobs.put({
        activityId,
        base64,
        mimeType: contentType,
        synced: true,
      });
    } catch {
      // Network error — URL表示のフォールバックがあるため無視
    }
  },

  // Server upsert (used by initialSync and syncEngine)
  async upsertActivities(activities: Omit<DexieActivity, "_syncStatus">[]) {
    if (activities.length === 0) return;
    const serverIds = activities.map((a) => a.id);
    const localRecords = await db.activities
      .where("id")
      .anyOf(serverIds)
      .toArray();
    const localMap = new Map(localRecords.map((r) => [r.id, r]));
    const safe = activities.filter((a) => {
      const local = localMap.get(a.id);
      if (!local) return true;
      if (local._syncStatus === "pending") return false;
      if (new Date(local.updatedAt) > new Date(a.updatedAt)) return false;
      return true;
    });
    if (safe.length === 0) return;
    await db.activities.bulkPut(
      safe.map((a) => ({ ...a, _syncStatus: "synced" as const })),
    );
  },

  async upsertActivityKinds(kinds: Omit<DexieActivityKind, "_syncStatus">[]) {
    if (kinds.length === 0) return;
    const serverIds = kinds.map((k) => k.id);
    const localRecords = await db.activityKinds
      .where("id")
      .anyOf(serverIds)
      .toArray();
    const localMap = new Map(localRecords.map((r) => [r.id, r]));
    const safe = kinds.filter((k) => {
      const local = localMap.get(k.id);
      if (!local) return true;
      if (local._syncStatus === "pending") return false;
      if (new Date(local.updatedAt) > new Date(k.updatedAt)) return false;
      return true;
    });
    if (safe.length === 0) return;
    await db.activityKinds.bulkPut(
      safe.map((k) => ({ ...k, _syncStatus: "synced" as const })),
    );
  },
} satisfies ActivityRepository;

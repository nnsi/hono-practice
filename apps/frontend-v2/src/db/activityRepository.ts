import { v7 as uuidv7 } from "uuid";
import {
  db,
  type DexieActivity,
  type DexieActivityKind,
} from "./schema";

type CreateActivityInput = {
  name: string;
  quantityUnit: string;
  emoji: string;
  showCombinedStats: boolean;
  kinds?: { name: string; color: string }[];
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
    const lastActivity = await db.activities
      .orderBy("orderIndex")
      .reverse()
      .first();
    const maxIndex = lastActivity?.orderIndex ?? "0";
    const newIndex = String(Number(maxIndex) + 1).padStart(6, "0");

    const activity: DexieActivity = {
      id: uuidv7(),
      userId: authState?.userId ?? "",
      name: input.name,
      label: "",
      emoji: input.emoji,
      iconType: "emoji",
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
        "name" | "quantityUnit" | "emoji" | "showCombinedStats"
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

  // Server upsert (used by initialSync and syncEngine)
  async upsertActivities(
    activities: Omit<DexieActivity, "_syncStatus">[],
  ) {
    await db.activities.bulkPut(
      activities.map((a) => ({ ...a, _syncStatus: "synced" as const })),
    );
  },

  async upsertActivityKinds(
    kinds: Omit<DexieActivityKind, "_syncStatus">[],
  ) {
    await db.activityKinds.bulkPut(
      kinds.map((k) => ({ ...k, _syncStatus: "synced" as const })),
    );
  },
};

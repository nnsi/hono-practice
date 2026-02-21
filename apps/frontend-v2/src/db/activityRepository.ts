import { db, type DexieActivity, type DexieActivityKind } from "./schema";

export const activityRepository = {
  async getAll() {
    return db.activities
      .orderBy("orderIndex")
      .filter((a) => !a.deletedAt)
      .toArray();
  },

  async getKindsByActivityId(activityId: string) {
    return db.activityKinds
      .where("activityId")
      .equals(activityId)
      .filter((k) => !k.deletedAt)
      .toArray();
  },

  async getAllKinds() {
    return db.activityKinds.filter((k) => !k.deletedAt).toArray();
  },

  async upsertActivities(activities: DexieActivity[]) {
    await db.activities.bulkPut(activities);
  },

  async upsertActivityKinds(kinds: DexieActivityKind[]) {
    await db.activityKinds.bulkPut(kinds);
  },
};

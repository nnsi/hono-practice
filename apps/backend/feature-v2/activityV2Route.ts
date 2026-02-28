import { and, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { Hono } from "hono";

import type { AppContext } from "../context";
import { activities, activityKinds } from "@infra/drizzle/schema";
import { SyncActivitiesRequestSchema } from "@packages/types-v2";

export const activityV2Route = new Hono<AppContext>()

// activities 取得（activityKinds 含む）
.get("/activities", async (c) => {
  const userId = c.get("userId");
  const db = c.env.DB;

  const result = await db
    .select()
    .from(activities)
    .where(and(eq(activities.userId, userId), isNull(activities.deletedAt)))
    .orderBy(activities.orderIndex);

  const activityIds = result.map((a) => a.id);
  const kinds =
    activityIds.length > 0
      ? await db
          .select()
          .from(activityKinds)
          .where(
            and(
              inArray(activityKinds.activityId, activityIds),
              isNull(activityKinds.deletedAt),
            ),
          )
      : [];

  return c.json({ activities: result, activityKinds: kinds });
})

// POST /activities/sync - バッチ同期（activities + activityKinds）
.post("/activities/sync", async (c) => {
  const body = await c.req.json();
  const parsed = SyncActivitiesRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { message: "Invalid request", errors: parsed.error.issues },
      400,
    );
  }

  const { activities: activityList, activityKinds: kindList } = parsed.data;
  const userId = c.get("userId");
  const db = c.env.DB;
  const maxAllowed = new Date(Date.now() + 5 * 60 * 1000);

  // --- Activities 同期 ---
  const actSkippedIds: string[] = [];

  const validActivities = activityList.filter((activity) => {
    if (new Date(activity.updatedAt) > maxAllowed) {
      actSkippedIds.push(activity.id);
      return false;
    }
    return true;
  });

  let actSyncedIds: string[] = [];
  let actServerWins: (typeof activities.$inferSelect)[] = [];

  if (validActivities.length > 0) {
    const upserted = await db
      .insert(activities)
      .values(
        validActivities.map((activity) => ({
          id: activity.id,
          userId,
          name: activity.name,
          label: activity.label,
          emoji: activity.emoji,
          iconType: activity.iconType,
          iconUrl: activity.iconUrl,
          iconThumbnailUrl: activity.iconThumbnailUrl,
          description: activity.description,
          quantityUnit: activity.quantityUnit,
          orderIndex: activity.orderIndex,
          showCombinedStats: activity.showCombinedStats,
          createdAt: new Date(activity.createdAt),
          updatedAt: new Date(activity.updatedAt),
          deletedAt: activity.deletedAt
            ? new Date(activity.deletedAt)
            : null,
        })),
      )
      .onConflictDoUpdate({
        target: activities.id,
        set: {
          name: sql`excluded.name`,
          label: sql`excluded.label`,
          emoji: sql`excluded.emoji`,
          iconType: sql`excluded.icon_type`,
          iconUrl: sql`COALESCE(excluded.icon_url, ${activities.iconUrl})`,
          iconThumbnailUrl: sql`COALESCE(excluded.icon_thumbnail_url, ${activities.iconThumbnailUrl})`,
          description: sql`excluded.description`,
          quantityUnit: sql`excluded.quantity_unit`,
          orderIndex: sql`excluded.order_index`,
          showCombinedStats: sql`excluded.show_combined_stats`,
          updatedAt: sql`excluded.updated_at`,
          deletedAt: sql`excluded.deleted_at`,
        },
        setWhere: and(
          lt(activities.updatedAt, sql`excluded.updated_at`),
          eq(activities.userId, userId),
        ),
      })
      .returning();

    const syncedIdSet = new Set(upserted.map((r) => r.id));
    actSyncedIds = [...syncedIdSet];

    const missedIds = validActivities
      .map((a) => a.id)
      .filter((id) => !syncedIdSet.has(id));

    if (missedIds.length > 0) {
      actServerWins = await db
        .select()
        .from(activities)
        .where(
          and(
            inArray(activities.id, missedIds),
            eq(activities.userId, userId),
          ),
        );
      const serverWinIdSet = new Set(actServerWins.map((s) => s.id));
      for (const id of missedIds) {
        if (!serverWinIdSet.has(id)) {
          actSkippedIds.push(id);
        }
      }
    }
  }

  // --- ActivityKinds 同期 ---
  // activityId 所有者チェック（一括）
  const requestedActivityIds = [
    ...new Set(kindList.map((k) => k.activityId)),
  ];
  const ownedActivities =
    requestedActivityIds.length > 0
      ? await db
          .select({ id: activities.id })
          .from(activities)
          .where(
            and(
              inArray(activities.id, requestedActivityIds),
              eq(activities.userId, userId),
            ),
          )
      : [];
  const ownedActivityIdSet = new Set(ownedActivities.map((a) => a.id));

  const kindSkippedIds: string[] = [];

  const validKinds = kindList.filter((kind) => {
    if (
      !ownedActivityIdSet.has(kind.activityId) ||
      new Date(kind.updatedAt) > maxAllowed
    ) {
      kindSkippedIds.push(kind.id);
      return false;
    }
    return true;
  });

  let kindSyncedIds: string[] = [];
  let kindServerWins: (typeof activityKinds.$inferSelect)[] = [];

  if (validKinds.length > 0) {
    const upserted = await db
      .insert(activityKinds)
      .values(
        validKinds.map((kind) => ({
          id: kind.id,
          activityId: kind.activityId,
          name: kind.name,
          color: kind.color,
          orderIndex: kind.orderIndex,
          createdAt: new Date(kind.createdAt),
          updatedAt: new Date(kind.updatedAt),
          deletedAt: kind.deletedAt ? new Date(kind.deletedAt) : null,
        })),
      )
      .onConflictDoUpdate({
        target: activityKinds.id,
        set: {
          activityId: sql`excluded.activity_id`,
          name: sql`excluded.name`,
          color: sql`excluded.color`,
          orderIndex: sql`excluded.order_index`,
          updatedAt: sql`excluded.updated_at`,
          deletedAt: sql`excluded.deleted_at`,
        },
        setWhere: lt(activityKinds.updatedAt, sql`excluded.updated_at`),
      })
      .returning();

    const syncedIdSet = new Set(upserted.map((r) => r.id));
    kindSyncedIds = [...syncedIdSet];

    const missedIds = validKinds
      .map((k) => k.id)
      .filter((id) => !syncedIdSet.has(id));

    if (missedIds.length > 0) {
      kindServerWins = await db
        .select()
        .from(activityKinds)
        .where(inArray(activityKinds.id, missedIds));
      const serverWinIdSet = new Set(kindServerWins.map((s) => s.id));
      for (const id of missedIds) {
        if (!serverWinIdSet.has(id)) {
          kindSkippedIds.push(id);
        }
      }
    }
  }

  return c.json({
    activities: {
      syncedIds: actSyncedIds,
      serverWins: actServerWins,
      skippedIds: actSkippedIds,
    },
    activityKinds: {
      syncedIds: kindSyncedIds,
      serverWins: kindServerWins,
      skippedIds: kindSkippedIds,
    },
  });
});

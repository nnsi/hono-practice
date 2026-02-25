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
  const actSyncedIds: string[] = [];
  const actServerWins: (typeof activities.$inferSelect)[] = [];
  const actSkippedIds: string[] = [];

  for (const activity of activityList) {
    if (new Date(activity.updatedAt) > maxAllowed) {
      actSkippedIds.push(activity.id);
      continue;
    }

    const result = await db
      .insert(activities)
      .values({
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
        deletedAt: activity.deletedAt ? new Date(activity.deletedAt) : null,
      })
      .onConflictDoUpdate({
        target: activities.id,
        set: {
          name: activity.name,
          label: activity.label,
          emoji: activity.emoji,
          iconType: activity.iconType,
          iconUrl: activity.iconUrl ?? sql`${activities.iconUrl}`,
          iconThumbnailUrl:
            activity.iconThumbnailUrl ??
            sql`${activities.iconThumbnailUrl}`,
          description: activity.description,
          quantityUnit: activity.quantityUnit,
          orderIndex: activity.orderIndex,
          showCombinedStats: activity.showCombinedStats,
          updatedAt: new Date(activity.updatedAt),
          deletedAt: activity.deletedAt ? new Date(activity.deletedAt) : null,
        },
        setWhere: and(
          lt(activities.updatedAt, new Date(activity.updatedAt)),
          eq(activities.userId, userId),
        ),
      })
      .returning();

    if (result.length > 0) {
      actSyncedIds.push(activity.id);
    } else {
      const serverActivity = await db
        .select()
        .from(activities)
        .where(
          and(eq(activities.id, activity.id), eq(activities.userId, userId)),
        )
        .limit(1);
      if (serverActivity.length > 0) {
        actServerWins.push(serverActivity[0]);
      } else {
        actSkippedIds.push(activity.id);
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

  const kindSyncedIds: string[] = [];
  const kindServerWins: (typeof activityKinds.$inferSelect)[] = [];
  const kindSkippedIds: string[] = [];

  for (const kind of kindList) {
    if (
      !ownedActivityIdSet.has(kind.activityId) ||
      new Date(kind.updatedAt) > maxAllowed
    ) {
      kindSkippedIds.push(kind.id);
      continue;
    }

    const result = await db
      .insert(activityKinds)
      .values({
        id: kind.id,
        activityId: kind.activityId,
        name: kind.name,
        color: kind.color,
        orderIndex: kind.orderIndex,
        createdAt: new Date(kind.createdAt),
        updatedAt: new Date(kind.updatedAt),
        deletedAt: kind.deletedAt ? new Date(kind.deletedAt) : null,
      })
      .onConflictDoUpdate({
        target: activityKinds.id,
        set: {
          activityId: kind.activityId,
          name: kind.name,
          color: kind.color,
          orderIndex: kind.orderIndex,
          updatedAt: new Date(kind.updatedAt),
          deletedAt: kind.deletedAt ? new Date(kind.deletedAt) : null,
        },
        setWhere: lt(activityKinds.updatedAt, new Date(kind.updatedAt)),
      })
      .returning();

    if (result.length > 0) {
      kindSyncedIds.push(kind.id);
    } else {
      const serverKind = await db
        .select()
        .from(activityKinds)
        .where(eq(activityKinds.id, kind.id))
        .limit(1);
      if (serverKind.length > 0) {
        kindServerWins.push(serverKind[0]);
      } else {
        kindSkippedIds.push(kind.id);
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

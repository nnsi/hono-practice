import {
  type Activity,
  type ActivityId,
  type ActivityKindId,
  ActivityKindsSchema,
  type UserId,
  createActivityEntity,
} from "@backend/domain";
import { activities, activityKinds } from "@infra/drizzle/schema";
import { and, asc, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";

import type { QueryExecutor } from "@backend/infra/rdb/drizzle";

export type ActivityRepository<T = any> = {
  getActivitiesByUserId(userId: UserId): Promise<Activity[]>;
  getActivitiesByIdsAndUserId(
    userId: UserId,
    ids: ActivityId[],
  ): Promise<Activity[]>;
  getActivityByIdAndUserId(
    userId: UserId,
    id: ActivityId,
  ): Promise<Activity | undefined>;
  getActivityByUserIdAndActivityKindId(
    userId: UserId,
    activityKindId: ActivityKindId,
  ): Promise<Activity | undefined>;
  getLastOrderIndexByUserId(userId: UserId): Promise<string | undefined>;
  createActivity(activity: Activity): Promise<Activity>;
  updateActivity(activity: Activity): Promise<Activity>;
  updateActivityIcon(
    activityId: ActivityId,
    iconType: "emoji" | "upload" | "generate",
    iconUrl?: string | null,
    iconThumbnailUrl?: string | null,
  ): Promise<void>;
  deleteActivity(activity: Activity): Promise<void>;
  getActivityChangesAfter(
    userId: UserId,
    timestamp: Date,
    limit?: number,
  ): Promise<{ activities: Activity[]; hasMore: boolean }>;
  withTx(tx: T): ActivityRepository<T>;
};

export function newActivityRepository(
  db: QueryExecutor,
): ActivityRepository<QueryExecutor> {
  return {
    getActivitiesByUserId: getActivitiesByUserId(db),
    getActivitiesByIdsAndUserId: getActivitiesByIdsAndUserId(db),
    getActivityByIdAndUserId: getActivityByIdAndUserId(db),
    getActivityByUserIdAndActivityKindId:
      getActivityByUserIdAndActivityKindId(db),
    getLastOrderIndexByUserId: getLastOrderIndexByUserId(db),
    createActivity: createActivity(db),
    updateActivity: updateActivity(db),
    updateActivityIcon: updateActivityIcon(db),
    deleteActivity: deleteActivity(db),
    getActivityChangesAfter: getActivityChangesAfter(db),
    withTx: (tx) => newActivityRepository(tx),
  };
}

function getActivitiesByUserId(db: QueryExecutor) {
  return async (userId: UserId): Promise<Activity[]> => {
    const rows = await db.query.activities.findMany({
      with: {
        kinds: {
          where: isNull(activityKinds.deletedAt),
        },
      },
      where: and(
        eq(activities.userId, userId),
        isNull(activities.deletedAt),
        isNull(activityKinds.deletedAt),
      ),
      orderBy: asc(activities.orderIndex),
    });

    return rows.map((r) => {
      const kinds = ActivityKindsSchema.parse(r.kinds ?? []);

      const activity = createActivityEntity({
        id: r.id,
        userId: r.userId,
        name: r.name,
        label: r.label || "",
        emoji: r.emoji || "",
        iconType: r.iconType,
        iconUrl: r.iconUrl,
        iconThumbnailUrl: r.iconThumbnailUrl,
        description: r.description || "",
        quantityUnit: r.quantityUnit || "",
        orderIndex: r.orderIndex || "",
        showCombinedStats: r.showCombinedStats,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        kinds: kinds,
        type: "persisted",
      });

      return activity;
    });
  };
}

function getActivitiesByIdsAndUserId(db: QueryExecutor) {
  return async (userId: UserId, ids: ActivityId[]): Promise<Activity[]> => {
    const rows = await db.query.activities.findMany({
      with: {
        kinds: {
          where: isNull(activityKinds.deletedAt),
        },
      },
      where: and(
        eq(activities.userId, userId),
        inArray(activities.id, ids),
        isNull(activities.deletedAt),
      ),
      orderBy: asc(activities.orderIndex),
    });

    return rows.map((r) => {
      const kinds = ActivityKindsSchema.parse(r.kinds);

      const activity = createActivityEntity({
        id: r.id,
        userId: r.userId,
        name: r.name,
        label: r.label || "",
        emoji: r.emoji || "",
        iconType: r.iconType,
        iconUrl: r.iconUrl,
        iconThumbnailUrl: r.iconThumbnailUrl,
        description: r.description || "",
        quantityUnit: r.quantityUnit || "",
        orderIndex: r.orderIndex || "",
        showCombinedStats: r.showCombinedStats,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        kinds: kinds,
        type: "persisted",
      });

      return activity;
    });
  };
}

function getActivityByIdAndUserId(db: QueryExecutor) {
  return async (
    userId: UserId,
    id: ActivityId,
  ): Promise<Activity | undefined> => {
    const row = await db.query.activities.findFirst({
      with: {
        kinds: true,
      },
      where: and(
        eq(activities.userId, userId),
        eq(activities.id, id),
        isNull(activities.deletedAt),
      ),
    });
    if (!row) return row;

    const kinds = ActivityKindsSchema.parse(row.kinds);

    const activity = createActivityEntity({
      id: row.id,
      userId: row.userId,
      name: row.name,
      label: row.label || "",
      emoji: row.emoji || "",
      iconType: row.iconType,
      iconUrl: row.iconUrl,
      iconThumbnailUrl: row.iconThumbnailUrl,
      description: row.description || "",
      quantityUnit: row.quantityUnit || "",
      orderIndex: row.orderIndex || "",
      showCombinedStats: row.showCombinedStats,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      kinds: kinds,
      type: "persisted",
    });

    return activity;
  };
}

function getActivityByUserIdAndActivityKindId(db: QueryExecutor) {
  return async (userId: UserId, activityKindId: ActivityKindId) => {
    const [row] = (
      await db.query.activities.findMany({
        with: {
          kinds: {
            where: eq(activityKinds.id, activityKindId),
          },
        },
        where: and(eq(activities.userId, userId), isNull(activities.deletedAt)),
      })
    ).filter((r) => r.kinds.length > 0);

    if (!row) return row;

    const kinds = ActivityKindsSchema.parse(row.kinds);

    const activity = createActivityEntity({
      id: row.id,
      userId: row.userId,
      name: row.name,
      label: row.label || "",
      emoji: row.emoji || "",
      iconType: row.iconType,
      iconUrl: row.iconUrl,
      iconThumbnailUrl: row.iconThumbnailUrl,
      description: row.description || "",
      quantityUnit: row.quantityUnit || "",
      orderIndex: row.orderIndex || "",
      showCombinedStats: row.showCombinedStats,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      kinds: kinds,
      type: "persisted",
    });

    return activity;
  };
}

function getLastOrderIndexByUserId(db: QueryExecutor) {
  return async (userId: UserId): Promise<string | undefined> => {
    const row = await db.query.activities.findFirst({
      where: and(eq(activities.userId, userId), isNull(activities.deletedAt)),
      orderBy: desc(activities.orderIndex),
    });

    return row?.orderIndex || undefined;
  };
}

function createActivity(db: QueryExecutor) {
  return async (activity: Activity): Promise<Activity> => {
    const { kinds, ..._activity } = activity;

    const [result] = await db
      .insert(activities)
      .values({
        ..._activity,
        userId: activity.userId,
        showCombinedStats: activity.showCombinedStats,
      })
      .returning();

    if (!kinds || kinds.length === 0) {
      return createActivityEntity({
        ...result,
        iconType: result.iconType,
        iconUrl: result.iconUrl,
        iconThumbnailUrl: result.iconThumbnailUrl,
        kinds: [],
        type: "persisted",
      });
    }

    const activityKindResults = await db
      .insert(activityKinds)
      .values(
        kinds.map((kind) => ({
          id: kind.id,
          activityId: result.id,
          name: kind.name,
          orderIndex: kind.orderIndex || null,
        })),
      )
      .returning();

    const parsedActivityKinds = ActivityKindsSchema.parse(activityKindResults);

    return createActivityEntity({
      ...result,
      iconType: result.iconType,
      iconUrl: result.iconUrl,
      iconThumbnailUrl: result.iconThumbnailUrl,
      kinds: parsedActivityKinds,
      type: "persisted",
    });
  };
}

function updateActivity(db: QueryExecutor) {
  return async (activity: Activity): Promise<Activity> => {
    const { kinds, ..._activity } = activity;

    await db
      .update(activities)
      .set({
        ..._activity,
        showCombinedStats: activity.showCombinedStats,
      })
      .where(and(eq(activities.id, activity.id), isNull(activities.deletedAt)));

    await db
      .update(activityKinds)
      .set({
        deletedAt: new Date(),
      })
      .where(
        and(
          eq(activityKinds.activityId, activity.id),
          isNull(activityKinds.deletedAt),
        ),
      );

    if (kinds && kinds.length > 0) {
      await db
        .insert(activityKinds)
        .values(
          kinds.map((kind) => ({
            id: kind.id || undefined,
            activityId: activity.id,
            name: kind.name,
            orderIndex: kind.orderIndex || null,
          })),
        )
        .onConflictDoUpdate({
          target: activityKinds.id,
          set: {
            name: sql`excluded.name`,
            orderIndex: sql`excluded.order_index`,
            deletedAt: sql`null`,
          },
        })
        .returning();
      activity.kinds = kinds;
    }

    return activity;
  };
}

function deleteActivity(db: QueryExecutor) {
  return async (activity: Activity): Promise<void> => {
    await db
      .update(activities)
      .set({
        deletedAt: new Date(),
      })
      .where(eq(activities.id, activity.id));

    return;
  };
}

function getActivityChangesAfter(db: QueryExecutor) {
  return async (
    userId: UserId,
    timestamp: Date,
    limit = 100,
  ): Promise<{ activities: Activity[]; hasMore: boolean }> => {
    const rows = await db
      .select()
      .from(activities)
      .where(
        and(eq(activities.userId, userId), gt(activities.updatedAt, timestamp)),
      )
      .orderBy(asc(activities.updatedAt))
      .limit(limit + 1); // +1 to check if there are more

    const hasMore = rows.length > limit;
    const activitiesData = rows.slice(0, limit);

    // 各活動に関連するActivityKindsを取得
    const activitiesWithKinds = await Promise.all(
      activitiesData.map(async (row) => {
        const kindsRows = await db
          .select()
          .from(activityKinds)
          .where(
            and(
              eq(activityKinds.activityId, row.id),
              isNull(activityKinds.deletedAt),
            ),
          )
          .orderBy(asc(activityKinds.orderIndex));

        const kinds = ActivityKindsSchema.parse(kindsRows);

        return createActivityEntity({
          type: "persisted",
          id: row.id,
          userId: row.userId,
          name: row.name,
          label: row.label || "",
          emoji: row.emoji || "",
          iconType: row.iconType,
          iconUrl: row.iconUrl,
          iconThumbnailUrl: row.iconThumbnailUrl,
          description: row.description || "",
          quantityUnit: row.quantityUnit || "",
          orderIndex: row.orderIndex || "",
          showCombinedStats: row.showCombinedStats,
          kinds: kinds,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        });
      }),
    );

    return {
      activities: activitiesWithKinds,
      hasMore,
    };
  };
}

function updateActivityIcon(db: QueryExecutor) {
  return async (
    activityId: ActivityId,
    iconType: "emoji" | "upload" | "generate",
    iconUrl?: string | null,
    iconThumbnailUrl?: string | null,
  ): Promise<void> => {
    await db
      .update(activities)
      .set({
        iconType,
        iconUrl: iconUrl || null,
        iconThumbnailUrl: iconThumbnailUrl || null,
        updatedAt: new Date(),
      })
      .where(eq(activities.id, activityId));
  };
}

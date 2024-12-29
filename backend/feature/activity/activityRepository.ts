import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import {
  Activity,
  type ActivityId,
  type ActivityKindId,
  type UserId,
} from "@/backend/domain";
import type { QueryExecutor } from "@/backend/infra/drizzle";
import { activities, activityKinds } from "@/drizzle/schema";

export type ActivityRepository = {
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
  deleteActivity(activity: Activity): Promise<void>;
  withTx(tx: QueryExecutor): ActivityRepository;
};

export function newActivityRepository(db: QueryExecutor): ActivityRepository {
  return {
    getActivitiesByUserId: getActivitiesByUserId(db),
    getActivitiesByIdsAndUserId: getActivitiesByIdsAndUserId(db),
    getActivityByIdAndUserId: getActivityByIdAndUserId(db),
    getActivityByUserIdAndActivityKindId:
      getActivityByUserIdAndActivityKindId(db),
    getLastOrderIndexByUserId: getLastOrderIndexByUserId(db),
    createActivity: createActivity(db),
    updateActivity: updateActivity(db),
    deleteActivity: deleteActivity(db),
    withTx: (tx) => newActivityRepository(tx),
  };
}

function getActivitiesByUserId(db: QueryExecutor) {
  return async (userId: UserId): Promise<Activity[]> => {
    const rows = await db.query.activities.findMany({
      with: {
        kinds: true,
      },
      where: and(eq(activities.userId, userId), isNull(activities.deletedAt)),
      orderBy: asc(activities.orderIndex),
    });

    return rows.map((r) => {
      return Activity.create(
        {
          id: r.id,
          userId: r.userId,
          name: r.name,
          label: r.label || "",
          emoji: r.emoji || "",
          description: r.description || "",
          quantityLabel: r.quantityLabel || "",
          orderIndex: r.orderIndex || "",
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        },
        r.kinds,
      );
    });
  };
}

function getActivitiesByIdsAndUserId(db: QueryExecutor) {
  return async (userId: UserId, ids: ActivityId[]): Promise<Activity[]> => {
    const rows = await db.query.activities.findMany({
      with: {
        kinds: true,
      },
      where: and(
        eq(activities.userId, userId),
        inArray(activities.id, ids),
        isNull(activities.deletedAt),
      ),
      orderBy: asc(activities.orderIndex),
    });

    return rows.map((r) => {
      return Activity.create(
        {
          id: r.id,
          userId: r.userId,
          name: r.name,
          label: r.label || "",
          emoji: r.emoji || "",
          description: r.description || "",
          quantityLabel: r.quantityLabel || "",
          orderIndex: r.orderIndex || "",
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        },
        r.kinds,
      );
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

    return Activity.create(
      {
        id: row.id,
        userId: row.userId,
        name: row.name,
        label: row.label || "",
        emoji: row.emoji || "",
        description: row.description || "",
        quantityLabel: row.quantityLabel || "",
        orderIndex: row.orderIndex || "",
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      row.kinds,
    );
  };
}

function getActivityByUserIdAndActivityKindId(db: QueryExecutor) {
  return async (userId: UserId, activityKindId: ActivityKindId) => {
    const row = await db.query.activities.findFirst({
      with: {
        kinds: true,
      },
      where: and(
        eq(activities.userId, userId),
        eq(activityKinds.id, activityKindId),
        isNull(activities.deletedAt),
      ),
    });

    if (!row) return row;

    return Activity.create(
      {
        id: row.id,
        userId: row.userId,
        name: row.name,
        label: row.label || "",
        emoji: row.emoji || "",
        description: row.description || "",
        quantityLabel: row.quantityLabel || "",
        orderIndex: row.orderIndex || "",
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      row.kinds,
    );
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

    const row = await db
      .insert(activities)
      .values({
        ..._activity,
        userId: activity.userId,
      })
      .returning();

    if (!kinds || kinds.length === 0) {
      return Activity.create(row[0]);
    }

    const rows = await db
      .insert(activityKinds)
      .values(
        kinds.map((kind) => ({
          activityId: row[0].id,
          name: kind.name,
          orderIndex: kind.orderIndex || null,
        })),
      )
      .returning();

    return Activity.create(row[0], rows);
  };
}

function updateActivity(db: QueryExecutor) {
  return async (activity: Activity): Promise<Activity> => {
    const { kinds, ..._activity } = activity;

    await db
      .update(activities)
      .set({
        ..._activity,
      })
      .where(and(eq(activities.id, activity.id), isNull(activities.deletedAt)));

    await db
      .update(activityKinds)
      .set({
        deletedAt: new Date(),
      })
      .where(
        and(eq(activityKinds.id, activity.id), isNull(activityKinds.deletedAt)),
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

import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import { activities, activityKinds } from "@infra/drizzle/schema";
import {
  type Activity,
  type ActivityId,
  type ActivityKindId,
  ActivityKindsSchema,
  createActivityEntity,
} from "@packages/domain/activity/activitySchema";
import type { UserId } from "@packages/domain/user/userSchema";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";

type ActivityRow = typeof activities.$inferSelect;

export function rowToActivity(
  r: ActivityRow,
  kinds: ReturnType<typeof ActivityKindsSchema.parse>,
): Activity {
  return createActivityEntity({
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
    recordingMode: r.recordingMode,
    recordingModeConfig: r.recordingModeConfig,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    kinds,
    type: "persisted",
  });
}

export function getActivitiesByUserId(db: QueryExecutor) {
  return async (userId: UserId): Promise<Activity[]> => {
    const rows = await db.query.activities.findMany({
      with: { kinds: { where: isNull(activityKinds.deletedAt) } },
      where: and(
        eq(activities.userId, userId),
        isNull(activities.deletedAt),
        isNull(activityKinds.deletedAt),
      ),
      orderBy: asc(activities.orderIndex),
    });
    return rows.map((r) =>
      rowToActivity(r, ActivityKindsSchema.parse(r.kinds ?? [])),
    );
  };
}

export function getActivitiesByIdsAndUserId(db: QueryExecutor) {
  return async (userId: UserId, ids: ActivityId[]): Promise<Activity[]> => {
    const rows = await db.query.activities.findMany({
      with: { kinds: { where: isNull(activityKinds.deletedAt) } },
      where: and(
        eq(activities.userId, userId),
        inArray(activities.id, ids),
        isNull(activities.deletedAt),
      ),
      orderBy: asc(activities.orderIndex),
    });
    return rows.map((r) =>
      rowToActivity(r, ActivityKindsSchema.parse(r.kinds)),
    );
  };
}

export function getActivityByIdAndUserId(db: QueryExecutor) {
  return async (
    userId: UserId,
    id: ActivityId,
  ): Promise<Activity | undefined> => {
    const row = await db.query.activities.findFirst({
      with: { kinds: true },
      where: and(
        eq(activities.userId, userId),
        eq(activities.id, id),
        isNull(activities.deletedAt),
      ),
    });
    if (!row) return row;
    return rowToActivity(row, ActivityKindsSchema.parse(row.kinds));
  };
}

export function getActivityByUserIdAndActivityKindId(db: QueryExecutor) {
  return async (userId: UserId, activityKindId: ActivityKindId) => {
    const [row] = (
      await db.query.activities.findMany({
        with: { kinds: { where: eq(activityKinds.id, activityKindId) } },
        where: and(eq(activities.userId, userId), isNull(activities.deletedAt)),
      })
    ).filter((r) => r.kinds.length > 0);
    if (!row) return row;
    return rowToActivity(row, ActivityKindsSchema.parse(row.kinds));
  };
}

export function getLastOrderIndexByUserId(db: QueryExecutor) {
  return async (userId: UserId): Promise<string | undefined> => {
    const row = await db.query.activities.findFirst({
      where: and(eq(activities.userId, userId), isNull(activities.deletedAt)),
      orderBy: desc(activities.orderIndex),
    });
    return row?.orderIndex || undefined;
  };
}

import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import { activityLogs } from "@infra/drizzle/schema";
import { createActivityEntity } from "@packages/domain/activity/activitySchema";
import {
  type ActivityLog,
  createActivityLogEntity,
} from "@packages/domain/activityLog/activityLogSchema";
import type { UserId } from "@packages/domain/user/userSchema";
import { and, eq, gt } from "drizzle-orm";

export function createActivityLog(db: QueryExecutor) {
  return async (activityLog: ActivityLog) => {
    const [row] = await db
      .insert(activityLogs)
      .values({
        id: activityLog.id,
        userId: activityLog.userId,
        activityId: activityLog.activity.id,
        activityKindId: activityLog.activityKind?.id,
        quantity: activityLog.quantity,
        memo: activityLog.memo,
        date: activityLog.date,
      })
      .returning();

    return createActivityLogEntity({
      ...activityLog,
      ...row,
      type: "persisted",
    });
  };
}

export function updateActivityLog(db: QueryExecutor) {
  return async (activityLog: ActivityLog) => {
    const [row] = await db
      .update(activityLogs)
      .set({
        quantity: activityLog.quantity,
        memo: activityLog.memo,
        date: activityLog.date,
        activityKindId: activityLog.activityKind?.id ?? null,
      })
      .where(eq(activityLogs.id, activityLog.id))
      .returning();

    return createActivityLogEntity({
      ...activityLog,
      ...row,
      type: "persisted",
    });
  };
}

export function deleteActivityLog(db: QueryExecutor) {
  return async (activityLog: ActivityLog) => {
    await db
      .update(activityLogs)
      .set({
        deletedAt: new Date(),
      })
      .where(eq(activityLogs.id, activityLog.id));
  };
}

export function createActivityLogBatch(db: QueryExecutor) {
  return async (logs: ActivityLog[]): Promise<ActivityLog[]> => {
    const values = logs.map((activityLog) => ({
      id: activityLog.id,
      userId: activityLog.userId,
      activityId: activityLog.activity.id,
      activityKindId: activityLog.activityKind?.id,
      quantity: activityLog.quantity,
      memo: activityLog.memo,
      date: activityLog.date,
    }));

    const rows = await db.insert(activityLogs).values(values).returning();

    return logs.map((log, index) =>
      createActivityLogEntity({
        ...log,
        ...rows[index],
        type: "persisted",
      }),
    );
  };
}

export function getActivityLogChangesAfter(db: QueryExecutor) {
  return async (
    userId: UserId,
    timestamp: Date,
    limit = 100,
  ): Promise<{ activityLogs: ActivityLog[]; hasMore: boolean }> => {
    const rows = await db.query.activityLogs.findMany({
      with: {
        activity: true,
        activityKind: true,
      },
      where: and(
        eq(activityLogs.userId, userId),
        gt(activityLogs.updatedAt, timestamp),
      ),
      orderBy: (logs, { asc }) => [asc(logs.updatedAt)],
      limit: limit + 1,
    });

    const hasMore = rows.length > limit;
    const activityLogsData = rows.slice(0, limit);

    return {
      activityLogs: activityLogsData.map((r) => {
        const activity = createActivityEntity({
          ...r.activity,
          kinds: r.activityKind ? [r.activityKind] : [],
          type: "persisted",
        });

        return createActivityLogEntity({
          ...r,
          activity,
          activityKind: activity.kinds[0],
          type: "persisted",
        });
      }),
      hasMore,
    };
  };
}

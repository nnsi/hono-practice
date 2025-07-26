import {
  type ActivityLog,
  type ActivityLogId,
  type UserId,
  createActivityEntity,
  createActivityLogEntity,
} from "@backend/domain";
import dayjs from "@backend/lib/dayjs";
import { activities, activityLogs } from "@infra/drizzle/schema";
import { and, between, eq, gt, isNull } from "drizzle-orm";

import type { QueryExecutor } from "@backend/infra/rdb/drizzle";

export type ActivityLogRepository<T = any> = {
  getActivityLogsByUserIdAndDate: (
    userId: UserId,
    from: Date,
    to: Date,
  ) => Promise<ActivityLog[]>;
  getActivityLogByIdAndUserId: (
    userId: UserId,
    activityLogId: ActivityLogId,
  ) => Promise<ActivityLog | undefined>;
  createActivityLog: (activityLog: ActivityLog) => Promise<ActivityLog>;
  createActivityLogBatch: (
    activityLogs: ActivityLog[],
  ) => Promise<ActivityLog[]>;
  updateActivityLog: (activityLog: ActivityLog) => Promise<ActivityLog>;
  deleteActivityLog: (activityLog: ActivityLog) => Promise<void>;
  getActivityLogChangesAfter: (
    userId: UserId,
    timestamp: Date,
    limit?: number,
  ) => Promise<{ activityLogs: ActivityLog[]; hasMore: boolean }>;
  withTx: (tx: T) => ActivityLogRepository<T>;
};

export function newActivityLogRepository(
  db: QueryExecutor,
): ActivityLogRepository<QueryExecutor> {
  return {
    getActivityLogsByUserIdAndDate: getActivityLogsByUserIdAndDate(db),
    getActivityLogByIdAndUserId: getActivityLogByIdAndUserId(db),
    createActivityLog: createActivityLog(db),
    createActivityLogBatch: createActivityLogBatch(db),
    updateActivityLog: updateActivityLog(db),
    deleteActivityLog: deleteActivityLog(db),
    getActivityLogChangesAfter: getActivityLogChangesAfter(db),
    withTx: (tx) => newActivityLogRepository(tx),
  };
}

function getActivityLogsByUserIdAndDate(db: QueryExecutor) {
  return async (userId: UserId, from: Date, to: Date) => {
    const fromStr = dayjs(from).format("YYYY-MM-DD");
    const toStr = dayjs(to).format("YYYY-MM-DD");

    const rows = await db.query.activityLogs.findMany({
      with: {
        activity: true,
        activityKind: true,
      },
      where: and(
        eq(activities.userId, userId),
        isNull(activityLogs.deletedAt),
        between(activityLogs.date, fromStr, toStr),
      ),
    });

    return rows.map((r) => {
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
    });
  };
}

function getActivityLogByIdAndUserId(db: QueryExecutor) {
  return async (userId: UserId, activityLogId: ActivityLogId) => {
    const row = await db.query.activityLogs.findFirst({
      with: {
        activity: true,
        activityKind: true,
      },
      where: and(
        eq(activityLogs.userId, userId),
        eq(activityLogs.id, activityLogId),
        isNull(activityLogs.deletedAt),
      ),
    });

    if (!row) {
      return undefined;
    }

    const activity = createActivityEntity({
      ...row.activity,
      kinds: row.activityKind ? [row.activityKind] : [],
      type: "persisted",
    });

    return createActivityLogEntity({
      ...row,
      activity,
      activityKind: activity.kinds[0],
      type: "persisted",
    });
  };
}

function createActivityLog(db: QueryExecutor) {
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

function updateActivityLog(db: QueryExecutor) {
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

function deleteActivityLog(db: QueryExecutor) {
  return async (activityLog: ActivityLog) => {
    await db
      .update(activityLogs)
      .set({
        deletedAt: new Date(),
      })
      .where(eq(activityLogs.id, activityLog.id));
  };
}

function getActivityLogChangesAfter(db: QueryExecutor) {
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
      limit: limit + 1, // +1 to check if there are more
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

function createActivityLogBatch(db: QueryExecutor) {
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

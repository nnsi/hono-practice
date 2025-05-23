import {
  type ActivityLog,
  type ActivityLogId,
  createActivityEntity,
  type UserId,
  createActivityLogEntity,
} from "@backend/domain";
import dayjs from "@backend/lib/dayjs";
import { activities, activityLogs } from "@infra/drizzle/schema";
import { and, between, eq, isNull } from "drizzle-orm";

import type { QueryExecutor } from "@backend/infra/rdb/drizzle";

export type ActivityLogRepository<T> = {
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
  updateActivityLog: (activityLog: ActivityLog) => Promise<ActivityLog>;
  deleteActivityLog: (activityLog: ActivityLog) => Promise<void>;
  withTx: (tx: V) => ActivityLogRepository<T>;
};

export function newActivityLogRepository(
  db: QueryExecutor,
): ActivityLogRepository<QueryExecutor> {
  return {
    getActivityLogsByUserIdAndDate: getActivityLogsByUserIdAndDate(db),
    getActivityLogByIdAndUserId: getActivityLogByIdAndUserId(db),
    createActivityLog: createActivityLog(db),
    updateActivityLog: updateActivityLog(db),
    deleteActivityLog: deleteActivityLog(db),
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

import { and, between, eq, isNull } from "drizzle-orm";

import {
  Activity,
  ActivityLog,
  type ActivityLogId,
  type UserId,
} from "@/backend/domain";
import type { QueryExecutor } from "@/backend/infra/drizzle";
import dayjs from "@/backend/lib/dayjs";
import { activities, activityLogs } from "@/drizzle/schema";

export type ActivityLogRepository = {
  getActivityLogsByUserIdAndDate: (
    userId: UserId,
    from: Date,
    to: Date,
  ) => Promise<ActivityLog[]>;
  getActivityLogByIdAndUserId: (
    userId: UserId,
    activityLogId: ActivityLogId,
  ) => Promise<ActivityLog>;
  createActivityLog: (activityLog: ActivityLog) => Promise<ActivityLog>;
  updateActivityLog: (activityLog: ActivityLog) => Promise<ActivityLog>;
  deleteActivityLog: (activityLog: ActivityLog) => Promise<void>;
};

export function newActivityLogRepository(
  db: QueryExecutor,
): ActivityLogRepository {
  return {
    getActivityLogsByUserIdAndDate: getActivityLogsByUserIdAndDate(db),
    getActivityLogByIdAndUserId: getActivityLogByIdAndUserId(db),
    createActivityLog: createActivityLog(db),
    updateActivityLog: updateActivityLog(db),
    deleteActivityLog: deleteActivityLog(db),
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
      const activity = Activity.create(
        r.activity,
        r.activityKind ? [r.activityKind] : undefined,
      );

      return ActivityLog.create({
        ...r,
        date: dayjs(r.date).format("YYYY-MM-DD"),
        memo: r.memo || "",
        activity: activity,
        activityKind: activity.kinds?.[0] || null,
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
      throw new Error("activity log not found");
    }

    const activity = Activity.create(
      row.activity,
      row.activityKind ? [row.activityKind] : undefined,
    );

    return ActivityLog.create({
      ...row,
      date: dayjs(row.date).format("YYYY-MM-DD"),
      memo: row.memo || "",
      activity: activity,
      activityKind: activity.kinds?.[0] || null,
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

    return ActivityLog.update(activityLog, row);
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
      })
      .where(eq(activityLogs.id, activityLog.id))
      .returning();

    return ActivityLog.update(activityLog, {
      ...row,
      date: dayjs(row.date).format("YYYY-MM-DD"),
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

import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import { activityLogs } from "@infra/drizzle/schema";
import {
  type ActivityId,
  createActivityEntity,
  createActivityId,
} from "@packages/domain/activity/activitySchema";
import {
  type ActivityLog,
  type ActivityLogId,
  createActivityLogEntity,
} from "@packages/domain/activityLog/activityLogSchema";
import type { UserId } from "@packages/domain/user/userSchema";
import { and, between, eq, isNull } from "drizzle-orm";

import {
  createActivityLog,
  createActivityLogBatch,
  deleteActivityLog,
  getActivityLogChangesAfter,
  updateActivityLog,
} from "./activityLogMutationRepository";

export type ActivityLogSummary = {
  activityId: ActivityId;
  quantity: number | null;
  date: string;
};

export type ActivityLogRepository<T = QueryExecutor> = {
  getActivityLogsByUserIdAndDate: (
    userId: UserId,
    from: string,
    to: string,
  ) => Promise<ActivityLog[]>;
  getActivityLogSummariesByUserIdAndDate: (
    userId: UserId,
    from: string,
    to: string,
  ) => Promise<ActivityLogSummary[]>;
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
    getActivityLogSummariesByUserIdAndDate:
      getActivityLogSummariesByUserIdAndDate(db),
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
  return async (userId: UserId, from: string, to: string) => {
    const rows = await db.query.activityLogs.findMany({
      with: {
        activity: true,
        activityKind: true,
      },
      where: and(
        eq(activityLogs.userId, userId),
        isNull(activityLogs.deletedAt),
        between(activityLogs.date, from, to),
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

function getActivityLogSummariesByUserIdAndDate(db: QueryExecutor) {
  return async (
    userId: UserId,
    from: string,
    to: string,
  ): Promise<ActivityLogSummary[]> => {
    const rows = await db
      .select({
        activityId: activityLogs.activityId,
        quantity: activityLogs.quantity,
        date: activityLogs.date,
      })
      .from(activityLogs)
      .where(
        and(
          eq(activityLogs.userId, userId),
          isNull(activityLogs.deletedAt),
          between(activityLogs.date, from, to),
        ),
      );

    return rows.map((row) => ({
      activityId: createActivityId(row.activityId),
      quantity: row.quantity,
      date: row.date,
    }));
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

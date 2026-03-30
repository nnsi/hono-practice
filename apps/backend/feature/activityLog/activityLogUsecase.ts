import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import type { Tracer } from "@backend/lib/tracer";
import type { ActivityQueryService } from "@backend/query";
import type {
  ActivityId,
  ActivityKindId,
} from "@packages/domain/activity/activitySchema";
import {
  type ActivityLog,
  type ActivityLogId,
  createActivityLogEntity,
  createActivityLogId,
} from "@packages/domain/activityLog/activityLogSchema";
import type { UserId } from "@packages/domain/user/userSchema";
import type {
  CreateActivityLogBatchResponse,
  GetActivityStatsResponse,
} from "@packages/types/response";

import type { ActivityRepository } from "../activity";
import { createActivityLogBatch } from "./activityLogBatchUsecase";
import {
  deleteActivityLog,
  getActivityLog,
  updateActivityLog,
} from "./activityLogMutationUsecase";
import type { ActivityLogRepository } from "./activityLogRepository";

export type GetActivityLogsParams = {
  from: string;
  to: string;
};

export type GetStatsParams = {
  from: string;
  to: string;
};

type CreateActivityLogParams = {
  id?: string;
  date: string;
  quantity: number;
  memo?: string;
  activityId?: string;
  activityKindId?: string;
};

export type ActivityLogUsecase = {
  getActivityLogs: (
    userId: UserId,
    params: GetActivityLogsParams,
  ) => Promise<ActivityLog[]>;
  getActivityLog: (
    userId: UserId,
    activityLogId: ActivityLogId,
  ) => Promise<ActivityLog>;
  createActivityLog: (
    userId: UserId,
    activityId: ActivityId,
    activityKindId: ActivityKindId,
    params: CreateActivityLogParams,
  ) => Promise<ActivityLog>;
  createActivityLogBatch: (
    userId: UserId,
    activityLogs: CreateActivityLogParams[],
  ) => Promise<CreateActivityLogBatchResponse>;
  updateActivityLog: (
    userId: UserId,
    activityLogId: ActivityLogId,
    params: { quantity?: number; memo?: string; activityKindId?: string },
  ) => Promise<ActivityLog>;
  deleteActivityLog: (
    userId: UserId,
    activityLogId: ActivityLogId,
  ) => Promise<void>;
  getStats: (
    userId: UserId,
    params: GetStatsParams,
  ) => Promise<GetActivityStatsResponse>;
};

export function newActivityLogUsecase(
  repo: ActivityLogRepository,
  acRepo: ActivityRepository,
  qs: ActivityQueryService,
  db: QueryExecutor,
  tracer: Tracer,
): ActivityLogUsecase {
  return {
    getActivityLogs: getActivityLogs(repo, tracer),
    getActivityLog: getActivityLog(repo, tracer),
    createActivityLog: createActivityLog(repo, acRepo, tracer),
    createActivityLogBatch: createActivityLogBatch(repo, acRepo, db, tracer),
    updateActivityLog: updateActivityLog(repo, acRepo, tracer),
    deleteActivityLog: deleteActivityLog(repo, tracer),
    getStats: getStats(qs, tracer),
  };
}

function getActivityLogs(repo: ActivityLogRepository, tracer: Tracer) {
  return async (userId: UserId, params: GetActivityLogsParams) => {
    const { from, to } = params;
    return tracer.span("db.getActivityLogsByUserIdAndDate", () =>
      repo.getActivityLogsByUserIdAndDate(userId, from, to),
    );
  };
}

function createActivityLog(
  repo: ActivityLogRepository,
  acRepo: ActivityRepository,
  tracer: Tracer,
) {
  return async (
    userId: UserId,
    activityId: ActivityId,
    activityKindId: ActivityKindId,
    params: CreateActivityLogParams,
  ) => {
    const activity = await tracer.span("db.getActivityByIdAndUserId", () =>
      acRepo.getActivityByIdAndUserId(userId, activityId),
    );
    if (!activity) throw new Error("activity not found");

    if (!activity.kinds) activity.kinds = [];

    const activityKind =
      activity.kinds.find((kind) => kind.id === activityKindId) || null;

    const activityLog = createActivityLogEntity({
      id: params.id ? createActivityLogId(params.id) : createActivityLogId(),
      userId,
      date: new Date(params.date),
      quantity: params.quantity,
      memo: params.memo,
      activity,
      activityKind: activityKind!,
      type: "new",
    });

    return tracer.span("db.createActivityLog", () =>
      repo.createActivityLog(activityLog),
    );
  };
}

function getStats(qs: ActivityQueryService, tracer: Tracer) {
  return async (userId: UserId, params: GetStatsParams) => {
    const { from, to } = params;
    return tracer.span("db.activityStatsQuery", () =>
      qs.activityStatsQuery(userId, from, to),
    );
  };
}

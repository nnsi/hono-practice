import {
  type ActivityId,
  type ActivityKindId,
  type ActivityLog,
  ActivityLogFactory,
  type ActivityLogId,
  type UserId,
} from "@backend/domain";
import { ResourceNotFoundError } from "@backend/error";

import type { GetActivityStatsResponse } from "@dtos/response";

import type { ActivityRepository } from "../activity";
import type { ActivityLogRepository } from "./activityLogRepository";
import type { ActivityQueryService } from "@backend/query";

export type GetActivityLogsParams = {
  from: Date;
  to: Date;
};

export type GetStatsParams = {
  from: Date;
  to: Date;
};

type CreateActivityLogParams = {
  date: string;
  quantity: number;
  memo?: string;
  activityId?: string;
  activityKindId?: string;
};

type UpdateActivityLogParams = {
  quantity?: number;
  memo?: string;
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
  updateActivityLog: (
    userId: UserId,
    activityLogId: ActivityLogId,
    params: UpdateActivityLogParams,
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
): ActivityLogUsecase {
  return {
    getActivityLogs: getActivityLogs(repo),
    getActivityLog: getActivityLog(repo),
    createActivityLog: createActivityLog(repo, acRepo),
    updateActivityLog: updateActivityLog(repo),
    deleteActivityLog: deleteActivityLog(repo),
    getStats: getStats(qs),
  };
}

function getActivityLogs(repo: ActivityLogRepository) {
  return async (userId: UserId, params: GetActivityLogsParams) => {
    const { from, to } = params;

    return repo.getActivityLogsByUserIdAndDate(userId, from, to);
  };
}

function getActivityLog(repo: ActivityLogRepository) {
  return async (userId: UserId, activityLogId: ActivityLogId) => {
    const aLog = await repo.getActivityLogByIdAndUserId(userId, activityLogId);
    if (!aLog) {
      throw new ResourceNotFoundError("activity log not found");
    }

    return aLog;
  };
}

function createActivityLog(
  repo: ActivityLogRepository,
  acRepo: ActivityRepository,
) {
  return async (
    userId: UserId,
    activityId: ActivityId,
    activityKindId: ActivityKindId,
    params: CreateActivityLogParams,
  ) => {
    const activity = await acRepo.getActivityByIdAndUserId(userId, activityId);
    if (!activity) {
      throw new Error("activity not found");
    }
    if (!activity.kinds) {
      activity.kinds = [];
    }

    const activityKind =
      activity.kinds.find((kind) => kind.id === activityKindId) || null;

    const activityLog = ActivityLogFactory.create({
      userId,
      date: new Date(params.date),
      quantity: params.quantity,
      memo: params.memo,
      activity: activity,
      activityKind: activityKind!,
    });

    return repo.createActivityLog(activityLog);
  };
}

function updateActivityLog(repo: ActivityLogRepository) {
  return async (
    userId: UserId,
    activityLogId: ActivityLogId,
    params: UpdateActivityLogParams,
  ) => {
    const activityLog = await repo.getActivityLogByIdAndUserId(
      userId,
      activityLogId,
    );
    if (!activityLog) {
      throw new ResourceNotFoundError("activity log not found");
    }

    const newActivityLog = ActivityLogFactory.update(activityLog, params);

    return repo.updateActivityLog(newActivityLog);
  };
}

function deleteActivityLog(repo: ActivityLogRepository) {
  return async (userId: UserId, activityLogId: ActivityLogId) => {
    const activityLog = await repo.getActivityLogByIdAndUserId(
      userId,
      activityLogId,
    );
    if (!activityLog) {
      throw new ResourceNotFoundError("activity log not found");
    }

    return repo.deleteActivityLog(activityLog);
  };
}

function getStats(qs: ActivityQueryService) {
  return async (userId: UserId, params: GetStatsParams) => {
    const { from, to } = params;

    return qs.activityStatsQuery(userId, from, to);
  };
}

import {
  ActivityId,
  ActivityKindId,
  ActivityLog,
  ActivityLogId,
  UserId,
} from "@/backend/domain";
import { ActivityQueryService } from "@/backend/query";
import { GetActivityStatsResponse } from "@/types/response";

import { ActivityRepository } from "../activity/activityRepository";

import { ActivityLogRepository } from "./activityLogRepository";

export type GetActivityLogsParams = {
  from: Date;
  to: Date;
};

export type GetStatsParams = {
  from: Date;
  to: Date;
};

type CreateActivityParams = {
  date: string;
  quantity: number;
  memo?: string;
  activityId?: string;
  activityKindId?: string;
};

type UpdateActivityParams = {
  quantity?: number;
  memo?: string;
};

export type ActivityLogUsecase = {
  getActivityLogs: (
    userId: UserId,
    params: GetActivityLogsParams
  ) => Promise<ActivityLog[]>;
  getActivityLog: (
    userId: UserId,
    activityLogId: ActivityLogId
  ) => Promise<ActivityLog>;
  createActivityLog: (
    userId: UserId,
    activityId: ActivityId,
    activityKindId: ActivityKindId,
    params: CreateActivityParams
  ) => Promise<ActivityLog>;
  updateActivityLog: (
    userId: UserId,
    activityLogId: ActivityLogId,
    params: UpdateActivityParams
  ) => Promise<ActivityLog>;
  deleteActivityLog: (
    userId: UserId,
    activityLogId: ActivityLogId
  ) => Promise<void>;
  getStats: (
    userId: UserId,
    params: GetStatsParams
  ) => Promise<GetActivityStatsResponse>;
};

export function newActivityLogUsecase(
  repo: ActivityLogRepository,
  acRepo: ActivityRepository,
  qs: ActivityQueryService
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
    return repo.getActivityLogByIdAndUserId(userId, activityLogId);
  };
}

function createActivityLog(
  repo: ActivityLogRepository,
  acRepo: ActivityRepository
) {
  return async (
    userId: UserId,
    activityId: ActivityId,
    activityKindId: ActivityKindId,
    params: CreateActivityParams
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

    const activityLog = ActivityLog.create({
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
    params: UpdateActivityParams
  ) => {
    const activityLog = await repo.getActivityLogByIdAndUserId(
      userId,
      activityLogId
    );

    const newActivityLog = ActivityLog.update(activityLog, params);

    return repo.updateActivityLog(newActivityLog);
  };
}

function deleteActivityLog(repo: ActivityLogRepository) {
  return async (userId: UserId, activityLogId: ActivityLogId) => {
    const activityLog = await repo.getActivityLogByIdAndUserId(
      userId,
      activityLogId
    );

    return repo.deleteActivityLog(activityLog);
  };
}

function getStats(qs: ActivityQueryService) {
  return async (userId: UserId, params: GetStatsParams) => {
    const { from, to } = params;

    return qs.activityStatsQuery(userId, from, to);
  };
}
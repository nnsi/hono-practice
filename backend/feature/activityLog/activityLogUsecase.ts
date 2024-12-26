import { ActivityLog, ActivityLogId, UserId } from "@/backend/domain";
import { ActivityQueryService } from "@/backend/query";
import { GetActivityStatsResponse } from "@/types/response";

import { ActivityLogRepository } from "./activityLogRepository";

export type GetActivityLogsParams = {
  from?: Date;
  to?: Date;
};

type CreateActivityParams = {};

type UpdateActivityParams = {};

export type ActivityLogUsecase = {
  getActivitiyLogs: (
    userId: UserId,
    params: GetActivityLogsParams
  ) => Promise<ActivityLog[]>;
  getActivityLog: (
    userId: UserId,
    activityLogId: ActivityLogId
  ) => Promise<ActivityLog>;
  createActivityLog: (
    userId: UserId,
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
    params: GetActivityLogsParams
  ) => Promise<GetActivityStatsResponse[]>;
};

export function newActivityLogUsecase(
  repo: ActivityLogRepository,
  qs: ActivityQueryService
): ActivityLogUsecase {
  return {};
}

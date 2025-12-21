import {
  type ActivityId,
  type ActivityKindId,
  type ActivityLog,
  type ActivityLogId,
  type UserId,
  createActivityId,
  createActivityKindId,
  createActivityLogEntity,
  createActivityLogId,
} from "@backend/domain";
import { ResourceNotFoundError } from "@backend/error";
import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import type { ActivityQueryService } from "@backend/query";
import type {
  CreateActivityLogBatchResponse,
  GetActivityStatsResponse,
} from "@dtos/response";

import type { ActivityRepository } from "../activity";
import type { ActivityLogRepository } from "./activityLogRepository";

export type GetActivityLogsParams = {
  from: Date;
  to: Date;
};

export type GetStatsParams = {
  from: Date;
  to: Date;
};

type CreateActivityLogParams = {
  id?: string;
  date: string;
  quantity: number;
  memo?: string;
  activityId?: string;
  activityKindId?: string;
};

type UpdateActivityLogParams = {
  quantity?: number;
  memo?: string;
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
  db: QueryExecutor,
): ActivityLogUsecase {
  return {
    getActivityLogs: getActivityLogs(repo),
    getActivityLog: getActivityLog(repo),
    createActivityLog: createActivityLog(repo, acRepo),
    createActivityLogBatch: createActivityLogBatch(repo, acRepo, db),
    updateActivityLog: updateActivityLog(repo, acRepo),
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
      activity: activity,
      activityKind: activityKind!,
      type: "new",
    });

    return repo.createActivityLog(activityLog);
  };
}

function updateActivityLog(
  repo: ActivityLogRepository,
  acRepo: ActivityRepository,
) {
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

    const activityKindParent = params.activityKindId
      ? await acRepo.getActivityByUserIdAndActivityKindId(
          userId,
          createActivityKindId(params.activityKindId),
        )
      : { kinds: [activityLog.activityKind] };
    if (!activityKindParent) {
      throw new ResourceNotFoundError("activity kind not found");
    }

    const activityKind =
      activityKindParent.kinds.find((ak) => ak?.id === params.activityKindId) ||
      null;

    const newActivityLog = createActivityLogEntity({
      ...activityLog,
      ...params,
      activityKind,
    });

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

function createActivityLogBatch(
  repo: ActivityLogRepository,
  acRepo: ActivityRepository,
  db: QueryExecutor,
) {
  return async (
    userId: UserId,
    activityLogs: CreateActivityLogParams[],
  ): Promise<CreateActivityLogBatchResponse> => {
    try {
      // トランザクション内で全件処理
      const createdLogs = await db.transaction(async (tx) => {
        const txRepo = repo.withTx(tx);
        const txAcRepo = acRepo.withTx(tx);

        const logsToCreate: ActivityLog[] = [];

        // 全てのアクティビティログを準備
        for (const params of activityLogs) {
          const activityId = createActivityId(params.activityId);
          const activityKindId = createActivityKindId(params.activityKindId);

          const activity = await txAcRepo.getActivityByIdAndUserId(
            userId,
            activityId,
          );
          if (!activity) {
            throw new Error(`Activity not found: ${params.activityId}`);
          }

          if (!activity.kinds) activity.kinds = [];

          const activityKind =
            activity.kinds.find((kind) => kind.id === activityKindId) || null;

          const activityLog = createActivityLogEntity({
            id: createActivityLogId(),
            userId,
            date: new Date(params.date),
            quantity: params.quantity,
            memo: params.memo,
            activity: activity,
            activityKind: activityKind!,
            type: "new",
          });

          logsToCreate.push(activityLog);
        }

        // バッチ作成
        return await txRepo.createActivityLogBatch(logsToCreate);
      });

      // 成功レスポンスを作成
      const results = createdLogs.map((log, index) => ({
        index,
        success: true,
        activityLogId: log.id,
      }));

      return {
        results,
        summary: {
          total: activityLogs.length,
          succeeded: activityLogs.length,
          failed: 0,
        },
      };
    } catch (error) {
      // トランザクションが失敗した場合、全件失敗として扱う
      const results = activityLogs.map((_, index) => ({
        index,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }));

      return {
        results,
        summary: {
          total: activityLogs.length,
          succeeded: 0,
          failed: activityLogs.length,
        },
      };
    }
  };
}

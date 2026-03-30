import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import type { Tracer } from "@backend/lib/tracer";
import {
  createActivityId,
  createActivityKindId,
} from "@packages/domain/activity/activitySchema";
import {
  type ActivityLog,
  createActivityLogEntity,
  createActivityLogId,
} from "@packages/domain/activityLog/activityLogSchema";
import type { UserId } from "@packages/domain/user/userSchema";
import type { CreateActivityLogBatchResponse } from "@packages/types/response";

import type { ActivityRepository } from "../activity";
import type { ActivityLogRepository } from "./activityLogRepository";

type CreateActivityLogParams = {
  id?: string;
  date: string;
  quantity: number;
  memo?: string;
  activityId?: string;
  activityKindId?: string;
};

export function createActivityLogBatch(
  repo: ActivityLogRepository,
  acRepo: ActivityRepository,
  db: QueryExecutor,
  tracer: Tracer,
) {
  return async (
    userId: UserId,
    activityLogs: CreateActivityLogParams[],
  ): Promise<CreateActivityLogBatchResponse> => {
    try {
      const createdLogs = await db.transaction(async (tx) => {
        const txRepo = repo.withTx(tx);
        const txAcRepo = acRepo.withTx(tx);

        const uniqueActivityIds = [
          ...new Set(activityLogs.map((p) => createActivityId(p.activityId))),
        ];
        const activities = await tracer.span(
          "db.getActivitiesByIdsAndUserId",
          () => txAcRepo.getActivitiesByIdsAndUserId(userId, uniqueActivityIds),
        );
        const activityMap = new Map(activities.map((a) => [a.id, a]));

        const logsToCreate: ActivityLog[] = [];

        for (const params of activityLogs) {
          const activityId = createActivityId(params.activityId);
          const activityKindId = createActivityKindId(params.activityKindId);

          const activity = activityMap.get(activityId);
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
            activity,
            activityKind: activityKind!,
            type: "new",
          });

          logsToCreate.push(activityLog);
        }

        return tracer.span("db.createActivityLogBatch", () =>
          txRepo.createActivityLogBatch(logsToCreate),
        );
      });

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

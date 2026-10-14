import { ResourceNotFoundError } from "@backend/error";
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
  activityId: string;
  activityKindId?: string | null;
};

function toBatchErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "Failed to create activity logs";
  if (
    error.message.startsWith("Activity not found:") ||
    error.message.startsWith("Activity kind not found:")
  ) {
    return error.message;
  }
  return "Failed to create activity logs";
}

const DUPLICATE_ERROR_MESSAGE = "Duplicate activity log";

type BatchResult = CreateActivityLogBatchResponse["results"][number];

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
    // 同一内容のログは正当な記録 (1 タップ = 1 件のバイナリ記録など) なので内容では
    // 重複判定しない。クライアント指定 id が既に存在する要素だけを duplicate として
    // 扱い、同じリクエストの再送で二重計上しないようにする。
    const duplicateIndexes = new Set<number>();

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

        const requestedIds = activityLogs
          .map((p) => p.id?.toLowerCase())
          .filter((id): id is string => id !== undefined);
        const existingIds =
          requestedIds.length === 0
            ? new Set<string>()
            : await tracer.span("db.getExistingActivityLogIds", () =>
                txRepo.getExistingActivityLogIds(userId, requestedIds),
              );
        const seenIds = new Set([...existingIds].map((id) => id.toLowerCase()));

        const logsToCreate: ActivityLog[] = [];

        for (const [index, params] of activityLogs.entries()) {
          const requestedId = params.id?.toLowerCase();
          if (requestedId !== undefined) {
            if (seenIds.has(requestedId)) {
              duplicateIndexes.add(index);
              continue;
            }
            seenIds.add(requestedId);
          }

          const activityId = createActivityId(params.activityId);
          const activityKindId =
            params.activityKindId == null
              ? null
              : createActivityKindId(params.activityKindId);

          const activity = activityMap.get(activityId);
          if (!activity) {
            throw new ResourceNotFoundError(
              `Activity not found: ${params.activityId}`,
            );
          }

          const activityForLog = { ...activity, kinds: activity.kinds ?? [] };
          const activityKind =
            activityKindId === null
              ? null
              : (activityForLog.kinds.find(
                  (kind) => kind.id === activityKindId,
                ) ?? null);
          if (activityKindId !== null && activityKind === null) {
            throw new ResourceNotFoundError(
              `Activity kind not found: ${params.activityKindId}`,
            );
          }

          const activityLog = createActivityLogEntity({
            id: params.id
              ? createActivityLogId(params.id)
              : createActivityLogId(),
            userId,
            date: new Date(params.date),
            quantity: params.quantity,
            memo: params.memo,
            activity: activityForLog,
            activityKind,
            type: "new",
          });

          logsToCreate.push(activityLog);
        }

        if (logsToCreate.length === 0) return [];
        return tracer.span("db.createActivityLogBatch", () =>
          txRepo.createActivityLogBatch(logsToCreate),
        );
      });

      const results: BatchResult[] = [];
      let createdIndex = 0;
      for (let index = 0; index < activityLogs.length; index++) {
        if (duplicateIndexes.has(index)) {
          results.push({
            index,
            success: false,
            error: DUPLICATE_ERROR_MESSAGE,
          });
          continue;
        }
        results.push({
          index,
          success: true,
          activityLogId: createdLogs[createdIndex].id,
        });
        createdIndex++;
      }

      return {
        results,
        summary: {
          total: activityLogs.length,
          succeeded: createdLogs.length,
          failed: duplicateIndexes.size,
        },
      };
    } catch (error) {
      const results = activityLogs.map((_, index) => ({
        index,
        success: false,
        error: toBatchErrorMessage(error),
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

import type { activityLogs } from "@infra/drizzle/schema";
import { validateActivityLogDate } from "@packages/domain/activityLog/activityLogValidation";
import type { UserId } from "@packages/domain/user/userSchema";
import type { UpsertActivityLogRequest } from "@packages/types";

import type { Tracer } from "../../lib/tracer";
import type { ActivityLogSyncRepository } from "./activityLogSyncRepository";

type ActivityLogRow = typeof activityLogs.$inferSelect;

export type SyncActivityLogsResult = {
  syncedIds: string[];
  serverWins: ActivityLogRow[];
  skippedIds: string[];
};

export type ActivityLogSyncUsecase = {
  getActivityLogs: (
    userId: UserId,
    since?: string,
  ) => Promise<{ logs: ActivityLogRow[] }>;
  syncActivityLogs: (
    userId: UserId,
    logs: UpsertActivityLogRequest[],
  ) => Promise<SyncActivityLogsResult>;
};

export function newActivityLogSyncUsecase(
  repo: ActivityLogSyncRepository,
  tracer: Tracer,
): ActivityLogSyncUsecase {
  return {
    getActivityLogs: getActivityLogs(repo, tracer),
    syncActivityLogs: syncActivityLogs(repo, tracer),
  };
}

function getActivityLogs(repo: ActivityLogSyncRepository, tracer: Tracer) {
  return async (
    userId: UserId,
    since?: string,
  ): Promise<{ logs: ActivityLogRow[] }> => {
    const logs = await tracer.span("db.getActivityLogsByUserId", () =>
      repo.getActivityLogsByUserId(userId, since),
    );
    return { logs };
  };
}

// v1 (`POST /users/activity-logs`) は domain factory 経由で 10 年超過去の日付を
// 拒否するが、sync は repository へ直接 upsert するため同じ検証をここで行う。
// 他の所有権 / FK チェックと同様に、バッチ全体ではなく当該レコードだけを skip する。
// 削除 (deletedAt あり) は既存行の tombstone なので日付検証の対象外にする。
// サーバー上で 10 年境界を越えたログの削除が届かなくなるのを避けるため。
function isAcceptableLogDate(date: string): boolean {
  try {
    validateActivityLogDate(date);
    return true;
  } catch {
    return false;
  }
}

function syncActivityLogs(repo: ActivityLogSyncRepository, tracer: Tracer) {
  return async (
    userId: UserId,
    logs: UpsertActivityLogRequest[],
  ): Promise<SyncActivityLogsResult> => {
    const skippedIds: string[] = [];

    const requestedActivityIds = [...new Set(logs.map((l) => l.activityId))];
    const requestedKindIds = [
      ...new Set(logs.map((l) => l.activityKindId).filter(Boolean)),
    ] as string[];
    const requestedTaskIds = [
      ...new Set(logs.map((l) => l.taskId).filter(Boolean)),
    ] as string[];

    // 3つの所有権 / FKチェックは互いに独立なので並列化する。直列だと Hyperdrive 往復が
    // 1回分余計にかかる（3/29 計測で ~50ms 削減）。
    const [ownedIds, ownedKindRows, existingTaskIds] = await Promise.all([
      tracer.span("db.getOwnedActivityIds", () =>
        repo.getOwnedActivityIds(userId, requestedActivityIds),
      ),
      tracer.span("db.getOwnedActivityKindIdsWithActivityId", () =>
        repo.getOwnedActivityKindIdsWithActivityId(userId, requestedKindIds),
      ),
      tracer.span("db.getExistingTaskIds", () =>
        repo.getExistingTaskIds(userId, requestedTaskIds),
      ),
    ]);
    const ownedActivityIdSet = new Set(ownedIds);
    const kindIdToActivityId = new Map(
      ownedKindRows.map((r) => [r.id, r.activityId]),
    );
    const existingTaskIdSet = new Set(existingTaskIds);

    const maxAllowed = new Date(Date.now() + 5 * 60 * 1000);

    const validLogs = logs.filter((log) => {
      if (
        (!log.deletedAt && !isAcceptableLogDate(log.date)) ||
        !ownedActivityIdSet.has(log.activityId) ||
        new Date(log.updatedAt) > maxAllowed ||
        (log.activityKindId &&
          (!kindIdToActivityId.has(log.activityKindId) ||
            kindIdToActivityId.get(log.activityKindId) !== log.activityId)) ||
        (log.taskId && !existingTaskIdSet.has(log.taskId))
      ) {
        skippedIds.push(log.id);
        return false;
      }
      return true;
    });

    if (validLogs.length === 0) {
      return { syncedIds: [], serverWins: [], skippedIds };
    }

    const upserted = await tracer.span("db.upsertActivityLogs", () =>
      repo.upsertActivityLogs(userId, validLogs),
    );

    const syncedIdSet = new Set(upserted.map((r) => r.id));
    const syncedIds = [...syncedIdSet];

    const missedIds = validLogs
      .map((l) => l.id)
      .filter((id) => !syncedIdSet.has(id));

    let serverWins: ActivityLogRow[] = [];
    if (missedIds.length > 0) {
      serverWins = await tracer.span("db.getActivityLogsByIds", () =>
        repo.getActivityLogsByIds(userId, missedIds),
      );
      const serverWinIdSet = new Set(serverWins.map((s) => s.id));
      for (const id of missedIds) {
        if (!serverWinIdSet.has(id)) {
          skippedIds.push(id);
        }
      }
    }

    return { syncedIds, serverWins, skippedIds };
  };
}

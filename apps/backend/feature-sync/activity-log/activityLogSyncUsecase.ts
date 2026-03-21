import type { activityLogs } from "@infra/drizzle/schema";
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

function syncActivityLogs(repo: ActivityLogSyncRepository, tracer: Tracer) {
  return async (
    userId: UserId,
    logs: UpsertActivityLogRequest[],
  ): Promise<SyncActivityLogsResult> => {
    const skippedIds: string[] = [];

    // activityId ownership check
    const requestedActivityIds = [...new Set(logs.map((l) => l.activityId))];
    const ownedIds = await tracer.span("db.getOwnedActivityIds", () =>
      repo.getOwnedActivityIds(userId, requestedActivityIds),
    );
    const ownedActivityIdSet = new Set(ownedIds);

    // FK existence check for activityKindId and taskId
    const requestedKindIds = [
      ...new Set(logs.map((l) => l.activityKindId).filter(Boolean)),
    ] as string[];
    const requestedTaskIds = [
      ...new Set(logs.map((l) => l.taskId).filter(Boolean)),
    ] as string[];

    const [existingKindIds, existingTaskIds] = await Promise.all([
      tracer.span("db.getExistingActivityKindIds", () =>
        repo.getExistingActivityKindIds(requestedKindIds),
      ),
      tracer.span("db.getExistingTaskIds", () =>
        repo.getExistingTaskIds(userId, requestedTaskIds),
      ),
    ]);
    const existingKindIdSet = new Set(existingKindIds);
    const existingTaskIdSet = new Set(existingTaskIds);

    const maxAllowed = new Date(Date.now() + 5 * 60 * 1000);

    const validLogs = logs.filter((log) => {
      if (
        !ownedActivityIdSet.has(log.activityId) ||
        new Date(log.updatedAt) > maxAllowed ||
        (log.activityKindId && !existingKindIdSet.has(log.activityKindId)) ||
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

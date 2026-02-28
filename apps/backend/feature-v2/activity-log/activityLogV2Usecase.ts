import type { UserId } from "@packages/domain/user/userSchema";
import type { UpsertActivityLogRequest } from "@packages/types-v2";
import { activityLogs } from "@infra/drizzle/schema";

import type { ActivityLogV2Repository } from "./activityLogV2Repository";

type ActivityLogRow = typeof activityLogs.$inferSelect;

export type SyncActivityLogsResult = {
  syncedIds: string[];
  serverWins: ActivityLogRow[];
  skippedIds: string[];
};

export type ActivityLogV2Usecase = {
  getActivityLogs: (
    userId: UserId,
    since?: string,
  ) => Promise<{ logs: ActivityLogRow[] }>;
  syncActivityLogs: (
    userId: UserId,
    logs: UpsertActivityLogRequest[],
  ) => Promise<SyncActivityLogsResult>;
};

export function newActivityLogV2Usecase(
  repo: ActivityLogV2Repository,
): ActivityLogV2Usecase {
  return {
    getActivityLogs: getActivityLogs(repo),
    syncActivityLogs: syncActivityLogs(repo),
  };
}

function getActivityLogs(repo: ActivityLogV2Repository) {
  return async (
    userId: UserId,
    since?: string,
  ): Promise<{ logs: ActivityLogRow[] }> => {
    const logs = await repo.getActivityLogsByUserId(userId, since);
    return { logs };
  };
}

function syncActivityLogs(repo: ActivityLogV2Repository) {
  return async (
    userId: UserId,
    logs: UpsertActivityLogRequest[],
  ): Promise<SyncActivityLogsResult> => {
    const skippedIds: string[] = [];

    // activityId ownership check
    const requestedActivityIds = [
      ...new Set(logs.map((l) => l.activityId)),
    ];
    const ownedIds = await repo.getOwnedActivityIds(
      userId,
      requestedActivityIds,
    );
    const ownedActivityIdSet = new Set(ownedIds);

    const maxAllowed = new Date(Date.now() + 5 * 60 * 1000);

    const validLogs = logs.filter((log) => {
      if (
        !ownedActivityIdSet.has(log.activityId) ||
        new Date(log.updatedAt) > maxAllowed
      ) {
        skippedIds.push(log.id);
        return false;
      }
      return true;
    });

    if (validLogs.length === 0) {
      return { syncedIds: [], serverWins: [], skippedIds };
    }

    const upserted = await repo.upsertActivityLogs(userId, validLogs);

    const syncedIdSet = new Set(upserted.map((r) => r.id));
    const syncedIds = [...syncedIdSet];

    const missedIds = validLogs
      .map((l) => l.id)
      .filter((id) => !syncedIdSet.has(id));

    let serverWins: ActivityLogRow[] = [];
    if (missedIds.length > 0) {
      serverWins = await repo.getActivityLogsByIds(userId, missedIds);
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

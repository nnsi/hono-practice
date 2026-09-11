import type { taskSchedules } from "@infra/drizzle/schema";
import type { UserId } from "@packages/domain/user/userSchema";
import type { UpsertTaskScheduleRequest } from "@packages/types";

import type { Tracer } from "../../lib/tracer";
import type { TaskScheduleSyncRepository } from "./taskScheduleSyncRepository";

type TaskScheduleRow = typeof taskSchedules.$inferSelect;

export type SyncResult = {
  syncedIds: string[];
  serverWins: TaskScheduleRow[];
  skippedIds: string[];
};

export type TaskScheduleSyncUsecase = {
  getTaskSchedules: (
    userId: UserId,
    since?: string,
  ) => Promise<{ taskSchedules: TaskScheduleRow[] }>;
  syncTaskSchedules: (
    userId: UserId,
    taskScheduleList: UpsertTaskScheduleRequest[],
  ) => Promise<SyncResult>;
};

export function newTaskScheduleSyncUsecase(
  repo: TaskScheduleSyncRepository,
  tracer: Tracer,
): TaskScheduleSyncUsecase {
  return {
    getTaskSchedules: getTaskSchedules(repo, tracer),
    syncTaskSchedules: syncTaskSchedules(repo, tracer),
  };
}

function getTaskSchedules(repo: TaskScheduleSyncRepository, tracer: Tracer) {
  return async (
    userId: UserId,
    since?: string,
  ): Promise<{ taskSchedules: TaskScheduleRow[] }> => {
    const result = await tracer.span("db.getTaskSchedulesByUserId", () =>
      repo.getTaskSchedulesByUserId(userId, since),
    );
    return { taskSchedules: result };
  };
}

function syncTaskSchedules(repo: TaskScheduleSyncRepository, tracer: Tracer) {
  return async (
    userId: UserId,
    taskScheduleList: UpsertTaskScheduleRequest[],
  ): Promise<SyncResult> => {
    const skippedIds: string[] = [];
    const maxAllowed = new Date(Date.now() + 5 * 60 * 1000);

    // activityId ownership check
    const requestedActivityIds = [
      ...new Set(
        taskScheduleList
          .map((t) => t.activityId)
          .filter((id): id is string => id !== null),
      ),
    ];
    const requestedKindIds = [
      ...new Set(
        taskScheduleList
          .map((t) => t.activityKindId)
          .filter((id): id is string => id !== null),
      ),
    ];

    const [ownedActivityIds, ownedKindRows] = await Promise.all([
      requestedActivityIds.length > 0
        ? tracer.span("db.getOwnedActivityIds", () =>
            repo.getOwnedActivityIds(userId, requestedActivityIds),
          )
        : Promise.resolve([]),
      tracer.span("db.getOwnedActivityKindIdsWithActivityId", () =>
        repo.getOwnedActivityKindIdsWithActivityId(userId, requestedKindIds),
      ),
    ]);

    const ownedActivityIdSet = new Set(ownedActivityIds);
    const kindIdToActivityId = new Map(
      ownedKindRows.map((r) => [r.id, r.activityId]),
    );

    const validTaskSchedules = taskScheduleList.filter((taskSchedule) => {
      if (
        new Date(taskSchedule.updatedAt) > maxAllowed ||
        (taskSchedule.activityId &&
          !ownedActivityIdSet.has(taskSchedule.activityId)) ||
        (taskSchedule.activityKindId &&
          (!taskSchedule.activityId ||
            !kindIdToActivityId.has(taskSchedule.activityKindId) ||
            kindIdToActivityId.get(taskSchedule.activityKindId) !==
              taskSchedule.activityId))
      ) {
        skippedIds.push(taskSchedule.id);
        return false;
      }
      return true;
    });

    if (validTaskSchedules.length === 0) {
      return { syncedIds: [], serverWins: [], skippedIds };
    }

    const upserted = await tracer.span("db.upsertTaskSchedules", () =>
      repo.upsertTaskSchedules(userId, validTaskSchedules),
    );

    const syncedIdSet = new Set(upserted.map((r) => r.id));
    const syncedIds = [...syncedIdSet];

    const missedIds = validTaskSchedules
      .map((t) => t.id)
      .filter((id) => !syncedIdSet.has(id));

    let serverWins: TaskScheduleRow[] = [];
    if (missedIds.length > 0) {
      serverWins = await tracer.span("db.getTaskSchedulesByIds", () =>
        repo.getTaskSchedulesByIds(userId, missedIds),
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

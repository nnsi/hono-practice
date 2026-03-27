import type { tasks } from "@infra/drizzle/schema";
import type { UserId } from "@packages/domain/user/userSchema";
import type { UpsertTaskRequest } from "@packages/types";

import type { Tracer } from "../../lib/tracer";
import type { TaskSyncRepository } from "./taskSyncRepository";

type TaskRow = typeof tasks.$inferSelect;

export type SyncResult = {
  syncedIds: string[];
  serverWins: TaskRow[];
  skippedIds: string[];
};

export type TaskSyncUsecase = {
  getTasks: (userId: UserId, since?: string) => Promise<{ tasks: TaskRow[] }>;
  syncTasks: (
    userId: UserId,
    taskList: UpsertTaskRequest[],
  ) => Promise<SyncResult>;
};

export function newTaskSyncUsecase(
  repo: TaskSyncRepository,
  tracer: Tracer,
): TaskSyncUsecase {
  return {
    getTasks: getTasks(repo, tracer),
    syncTasks: syncTasks(repo, tracer),
  };
}

function getTasks(repo: TaskSyncRepository, tracer: Tracer) {
  return async (
    userId: UserId,
    since?: string,
  ): Promise<{ tasks: TaskRow[] }> => {
    const result = await tracer.span("db.getTasksByUserId", () =>
      repo.getTasksByUserId(userId, since),
    );
    return { tasks: result };
  };
}

function syncTasks(repo: TaskSyncRepository, tracer: Tracer) {
  return async (
    userId: UserId,
    taskList: UpsertTaskRequest[],
  ): Promise<SyncResult> => {
    const skippedIds: string[] = [];
    const maxAllowed = new Date(Date.now() + 5 * 60 * 1000);

    // activityId ownership check
    const requestedActivityIds = [
      ...new Set(taskList.map((t) => t.activityId).filter(Boolean)),
    ] as string[];
    const requestedKindIds = [
      ...new Set(taskList.map((t) => t.activityKindId).filter(Boolean)),
    ] as string[];

    const [ownedActivityIds, ownedKindRows] = await Promise.all([
      requestedActivityIds.length > 0
        ? tracer.span("db.getOwnedActivityIds", () =>
            repo.getOwnedActivityIds(userId, requestedActivityIds),
          )
        : Promise.resolve([] as string[]),
      tracer.span("db.getOwnedActivityKindIdsWithActivityId", () =>
        repo.getOwnedActivityKindIdsWithActivityId(userId, requestedKindIds),
      ),
    ]);

    const ownedActivityIdSet = new Set(ownedActivityIds);
    const kindIdToActivityId = new Map(
      ownedKindRows.map((r) => [r.id, r.activityId]),
    );

    const validTasks = taskList.filter((task) => {
      if (
        new Date(task.updatedAt) > maxAllowed ||
        (task.activityId && !ownedActivityIdSet.has(task.activityId)) ||
        (task.activityKindId &&
          (!kindIdToActivityId.has(task.activityKindId) ||
            (task.activityId &&
              kindIdToActivityId.get(task.activityKindId) !== task.activityId)))
      ) {
        skippedIds.push(task.id);
        return false;
      }
      return true;
    });

    if (validTasks.length === 0) {
      return { syncedIds: [], serverWins: [], skippedIds };
    }

    const upserted = await tracer.span("db.upsertTasks", () =>
      repo.upsertTasks(userId, validTasks),
    );

    const syncedIdSet = new Set(upserted.map((r) => r.id));
    const syncedIds = [...syncedIdSet];

    const missedIds = validTasks
      .map((t) => t.id)
      .filter((id) => !syncedIdSet.has(id));

    let serverWins: TaskRow[] = [];
    if (missedIds.length > 0) {
      serverWins = await tracer.span("db.getTasksByIds", () =>
        repo.getTasksByIds(userId, missedIds),
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

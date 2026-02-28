import type { UserId } from "@packages/domain/user/userSchema";
import type { UpsertTaskRequest } from "@packages/types-v2";
import { tasks } from "@infra/drizzle/schema";
import type { Tracer } from "../../lib/tracer";

import type { TaskV2Repository } from "./taskV2Repository";

type TaskRow = typeof tasks.$inferSelect;

export type SyncResult = {
  syncedIds: string[];
  serverWins: TaskRow[];
  skippedIds: string[];
};

export type TaskV2Usecase = {
  getTasks: (
    userId: UserId,
    since?: string,
  ) => Promise<{ tasks: TaskRow[] }>;
  syncTasks: (
    userId: UserId,
    taskList: UpsertTaskRequest[],
  ) => Promise<SyncResult>;
};

export function newTaskV2Usecase(
  repo: TaskV2Repository,
  tracer: Tracer,
): TaskV2Usecase {
  return {
    getTasks: getTasks(repo, tracer),
    syncTasks: syncTasks(repo, tracer),
  };
}

function getTasks(repo: TaskV2Repository, tracer: Tracer) {
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

function syncTasks(repo: TaskV2Repository, tracer: Tracer) {
  return async (
    userId: UserId,
    taskList: UpsertTaskRequest[],
  ): Promise<SyncResult> => {
    const skippedIds: string[] = [];
    const maxAllowed = new Date(Date.now() + 5 * 60 * 1000);

    const validTasks = taskList.filter((task) => {
      if (new Date(task.updatedAt) > maxAllowed) {
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

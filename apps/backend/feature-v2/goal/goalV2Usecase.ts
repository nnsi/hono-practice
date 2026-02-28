import type { UserId } from "@packages/domain/user/userSchema";
import type { UpsertGoalRequest } from "@packages/types-v2";
import { activityGoals } from "@infra/drizzle/schema";
import type { Tracer } from "../../lib/tracer";

import type { GoalV2Repository } from "./goalV2Repository";

type GoalRow = typeof activityGoals.$inferSelect;

type GoalWithStats = GoalRow & {
  currentBalance: number;
  totalTarget: number;
  totalActual: number;
};

export type SyncGoalsResult = {
  syncedIds: string[];
  serverWins: GoalRow[];
  skippedIds: string[];
};

export type GoalV2Usecase = {
  getGoals: (
    userId: UserId,
    since?: string,
  ) => Promise<{ goals: GoalWithStats[] }>;
  syncGoals: (
    userId: UserId,
    goals: UpsertGoalRequest[],
  ) => Promise<SyncGoalsResult>;
};

export function newGoalV2Usecase(
  repo: GoalV2Repository,
  tracer: Tracer,
): GoalV2Usecase {
  return {
    getGoals: getGoals(repo, tracer),
    syncGoals: syncGoals(repo, tracer),
  };
}

function getGoals(repo: GoalV2Repository, tracer: Tracer) {
  return async (
    userId: UserId,
    since?: string,
  ): Promise<{ goals: GoalWithStats[] }> => {
    const goals = await tracer.span("db.getGoalsByUserId", () =>
      repo.getGoalsByUserId(userId, since),
    );

    const goalsWithStats = await Promise.all(
      goals.map(async (goal) => {
        if (goal.deletedAt) {
          return { ...goal, currentBalance: 0, totalTarget: 0, totalActual: 0 };
        }

        const today = new Date().toISOString().split("T")[0];
        const endDate = goal.endDate ?? today;
        const effectiveEnd = endDate < today! ? endDate : today!;

        const start = new Date(goal.startDate);
        const end = new Date(effectiveEnd);
        const days = Math.max(
          Math.floor(
            (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
          ) + 1,
          0,
        );

        const totalTarget = days * Number(goal.dailyTargetQuantity);

        const totalActual = await tracer.span(
          "db.getGoalActualQuantity",
          () =>
            repo.getGoalActualQuantity(
              userId,
              goal.activityId,
              goal.startDate,
              effectiveEnd,
            ),
        );

        const currentBalance = totalActual - totalTarget;

        return { ...goal, currentBalance, totalTarget, totalActual };
      }),
    );

    return { goals: goalsWithStats };
  };
}

function syncGoals(repo: GoalV2Repository, tracer: Tracer) {
  return async (
    userId: UserId,
    goals: UpsertGoalRequest[],
  ): Promise<SyncGoalsResult> => {
    const activityIds = [...new Set(goals.map((g) => g.activityId))];
    const ownedIds = await tracer.span("db.getOwnedActivityIds", () =>
      repo.getOwnedActivityIds(userId, activityIds),
    );
    const ownedActivityIdSet = new Set(ownedIds);

    const skippedIds: string[] = [];
    const maxAllowed = new Date(Date.now() + 5 * 60 * 1000);

    const validGoals = goals.filter((goal) => {
      if (
        !ownedActivityIdSet.has(goal.activityId) ||
        new Date(goal.updatedAt) > maxAllowed
      ) {
        skippedIds.push(goal.id);
        return false;
      }
      return true;
    });

    if (validGoals.length === 0) {
      return { syncedIds: [], serverWins: [], skippedIds };
    }

    const upserted = await tracer.span("db.upsertGoals", () =>
      repo.upsertGoals(userId, validGoals),
    );

    const syncedIdSet = new Set(upserted.map((r) => r.id));
    const syncedIds = [...syncedIdSet];

    const missedIds = validGoals
      .map((g) => g.id)
      .filter((id) => !syncedIdSet.has(id));

    let serverWins: GoalRow[] = [];
    if (missedIds.length > 0) {
      serverWins = await tracer.span("db.getGoalsByIds", () =>
        repo.getGoalsByIds(userId, missedIds),
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

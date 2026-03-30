import type { activityGoals } from "@infra/drizzle/schema";
import { parseDayTargets } from "@packages/domain/goal/dayTargets";
import type { UserId } from "@packages/domain/user/userSchema";
import type { UpsertGoalRequest } from "@packages/types";

import type { Tracer } from "../../lib/tracer";
import type { GoalSyncRepository } from "./goalSyncRepository";
import type { SyncGoalsResult } from "./goalSyncUsecase";

type GoalRow = typeof activityGoals.$inferSelect;

export function syncGoals(repo: GoalSyncRepository, tracer: Tracer) {
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

    const normalizedServerWins = serverWins.map((g) => ({
      ...g,
      dayTargets: parseDayTargets(g.dayTargets),
    }));

    return { syncedIds, serverWins: normalizedServerWins, skippedIds };
  };
}

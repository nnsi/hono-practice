import type { activityGoalFreezePeriods } from "@infra/drizzle/schema";
import type { UserId } from "@packages/domain/user/userSchema";
import type { UpsertGoalFreezePeriodRequest } from "@packages/types";

import type { Tracer } from "../../lib/tracer";
import type { GoalFreezePeriodV2Repository } from "./goalFreezePeriodV2Repository";

type FreezePeriodRow = typeof activityGoalFreezePeriods.$inferSelect;

export type SyncFreezePeriodsResult = {
  syncedIds: string[];
  serverWins: FreezePeriodRow[];
  skippedIds: string[];
};

export type GoalFreezePeriodV2Usecase = {
  getFreezePeriods: (
    userId: UserId,
    since?: string,
  ) => Promise<{ freezePeriods: FreezePeriodRow[] }>;
  syncFreezePeriods: (
    userId: UserId,
    periods: UpsertGoalFreezePeriodRequest[],
  ) => Promise<SyncFreezePeriodsResult>;
};

export function newGoalFreezePeriodV2Usecase(
  repo: GoalFreezePeriodV2Repository,
  tracer: Tracer,
): GoalFreezePeriodV2Usecase {
  return {
    getFreezePeriods: getFreezePeriods(repo, tracer),
    syncFreezePeriods: syncFreezePeriods(repo, tracer),
  };
}

function getFreezePeriods(repo: GoalFreezePeriodV2Repository, tracer: Tracer) {
  return async (
    userId: UserId,
    since?: string,
  ): Promise<{ freezePeriods: FreezePeriodRow[] }> => {
    const freezePeriods = await tracer.span("db.getFreezePeriodsByUserId", () =>
      repo.getFreezePeriodsByUserId(userId, since),
    );
    return { freezePeriods };
  };
}

function syncFreezePeriods(repo: GoalFreezePeriodV2Repository, tracer: Tracer) {
  return async (
    userId: UserId,
    periods: UpsertGoalFreezePeriodRequest[],
  ): Promise<SyncFreezePeriodsResult> => {
    const goalIds = [...new Set(periods.map((p) => p.goalId))];
    const ownedIds = await tracer.span("db.getOwnedGoalIds", () =>
      repo.getOwnedGoalIds(userId, goalIds),
    );
    const ownedGoalIdSet = new Set(ownedIds);

    const skippedIds: string[] = [];
    const maxAllowed = new Date(Date.now() + 5 * 60 * 1000);

    const validPeriods = periods.filter((period) => {
      if (
        !ownedGoalIdSet.has(period.goalId) ||
        new Date(period.updatedAt) > maxAllowed
      ) {
        skippedIds.push(period.id);
        return false;
      }
      return true;
    });

    if (validPeriods.length === 0) {
      return { syncedIds: [], serverWins: [], skippedIds };
    }

    const upserted = await tracer.span("db.upsertFreezePeriods", () =>
      repo.upsertFreezePeriods(userId, validPeriods),
    );

    const syncedIdSet = new Set(upserted.map((r) => r.id));
    const syncedIds = [...syncedIdSet];

    const missedIds = validPeriods
      .map((p) => p.id)
      .filter((id) => !syncedIdSet.has(id));

    let serverWins: FreezePeriodRow[] = [];
    if (missedIds.length > 0) {
      serverWins = await tracer.span("db.getFreezePeriodsByIds", () =>
        repo.getFreezePeriodsByIds(userId, missedIds),
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

import type {
  activityGoalFreezePeriods,
  activityGoals,
} from "@infra/drizzle/schema";
import { parseDayTargets } from "@packages/domain/goal/dayTargets";
import {
  type FreezePeriod,
  calculateGoalBalance,
} from "@packages/domain/goal/goalBalance";
import type { UserId } from "@packages/domain/user/userSchema";
import type { UpsertGoalRequest } from "@packages/types";

import type { Tracer } from "../../lib/tracer";
import type { GoalFreezePeriodSyncRepository } from "../goal-freeze-period/goalFreezePeriodSyncRepository";
import type { GoalSyncRepository } from "./goalSyncRepository";

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

export type GoalSyncUsecase = {
  getGoals: (
    userId: UserId,
    since?: string,
  ) => Promise<{ goals: GoalWithStats[] }>;
  syncGoals: (
    userId: UserId,
    goals: UpsertGoalRequest[],
  ) => Promise<SyncGoalsResult>;
};

export function newGoalSyncUsecase(
  repo: GoalSyncRepository,
  freezeRepo: GoalFreezePeriodSyncRepository,
  tracer: Tracer,
): GoalSyncUsecase {
  return {
    getGoals: getGoals(repo, freezeRepo, tracer),
    syncGoals: syncGoals(repo, tracer),
  };
}

type FreezePeriodRow = typeof activityGoalFreezePeriods.$inferSelect;

function toFreezePeriods(rows: FreezePeriodRow[]): FreezePeriod[] {
  return rows
    .filter((r) => !r.deletedAt)
    .map((r) => ({ startDate: r.startDate, endDate: r.endDate }));
}

function getGoals(
  repo: GoalSyncRepository,
  freezeRepo: GoalFreezePeriodSyncRepository,
  tracer: Tracer,
) {
  return async (
    userId: UserId,
    since?: string,
  ): Promise<{ goals: GoalWithStats[] }> => {
    const goals = await tracer.span("db.getGoalsByUserId", () =>
      repo.getGoalsByUserId(userId, since),
    );

    const activeGoalIds = goals.filter((g) => !g.deletedAt).map((g) => g.id);

    const allFreezePeriods =
      activeGoalIds.length > 0
        ? await tracer.span("db.getFreezePeriodsByGoalIds", () =>
            freezeRepo.getFreezePeriodsByGoalIds(userId, activeGoalIds),
          )
        : [];

    const freezeByGoalId = new Map<string, FreezePeriodRow[]>();
    for (const fp of allFreezePeriods) {
      const existing = freezeByGoalId.get(fp.goalId) ?? [];
      existing.push(fp);
      freezeByGoalId.set(fp.goalId, existing);
    }

    const today = new Date().toISOString().split("T")[0]!;

    const goalsWithStats = await Promise.all(
      goals.map(async (goal) => {
        if (goal.deletedAt) {
          return {
            ...goal,
            dayTargets: parseDayTargets(goal.dayTargets),
            currentBalance: 0,
            totalTarget: 0,
            totalActual: 0,
          };
        }

        const effectiveEnd =
          goal.endDate && today > goal.endDate ? goal.endDate : today;

        const totalActual = await tracer.span("db.getGoalActualQuantity", () =>
          repo.getGoalActualQuantity(
            userId,
            goal.activityId,
            goal.startDate,
            effectiveEnd,
          ),
        );

        const freezePeriods = toFreezePeriods(
          freezeByGoalId.get(goal.id) ?? [],
        );

        const result = calculateGoalBalance(
          {
            dailyTargetQuantity: Number(goal.dailyTargetQuantity),
            startDate: goal.startDate,
            endDate: goal.endDate,
            debtCap: goal.debtCap != null ? Number(goal.debtCap) : null,
            dayTargets: parseDayTargets(goal.dayTargets),
          },
          [{ date: goal.startDate, quantity: totalActual }],
          today,
          freezePeriods,
        );

        return {
          ...goal,
          dayTargets: parseDayTargets(goal.dayTargets),
          currentBalance: result.currentBalance,
          totalTarget: result.totalTarget,
          totalActual: result.totalActual,
        };
      }),
    );

    return { goals: goalsWithStats };
  };
}

function syncGoals(repo: GoalSyncRepository, tracer: Tracer) {
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

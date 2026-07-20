import { ResourceNotFoundError } from "@backend/error";
import type { Tracer } from "@backend/lib/tracer";
import { createActivityGoalId } from "@packages/domain/goal/goalSchema";
import type { UserId } from "@packages/domain/user/userSchema";

import type { ActivityRepository } from "../activity/activityRepository";
import { prefetchActivityLogs } from "../activitygoal/activityGoalPrefetch";
import type { ActivityGoalRepository } from "../activitygoal/activityGoalRepository";
import type { ActivityGoalService } from "../activitygoal/activityGoalService";
import type { ActivityLogRepository } from "../activityLog";
import type { Goal, GoalFilters } from "./goalTypes";
import { goalEntityToResponse } from "./goalTypes";
import { createGoal, deleteGoal, updateGoal } from "./goalWriteUsecase";

export type {
  CreateGoalRequest,
  GoalFilters,
  GoalUsecase,
  UpdateGoalRequest,
} from "./goalTypes";

export function newGoalUsecase(
  activityGoalRepo: ActivityGoalRepository,
  activityRepo: ActivityRepository,
  activityGoalService: ActivityGoalService,
  activityLogRepo: ActivityLogRepository,
  tracer: Tracer,
) {
  return {
    getGoals: getGoals(
      activityGoalRepo,
      activityGoalService,
      activityLogRepo,
      tracer,
    ),
    getGoal: getGoal(activityGoalRepo, activityGoalService, tracer),
    createGoal: createGoal(activityGoalRepo, activityRepo, tracer),
    updateGoal: updateGoal(activityGoalRepo, tracer),
    deleteGoal: deleteGoal(activityGoalRepo, tracer),
  };
}

function getGoals(
  activityGoalRepo: ActivityGoalRepository,
  activityGoalService: ActivityGoalService,
  activityLogRepo: ActivityLogRepository,
  tracer: Tracer,
) {
  return async (
    userId: UserId,
    filters: GoalFilters | undefined,
    clientDate: string,
  ): Promise<Goal[]> => {
    const goals = await tracer.span("db.getActivityGoalsByUserId", () =>
      activityGoalRepo.getActivityGoalsByUserId(userId),
    );

    // activity-logs と freeze periods を1回ずつ一括取得（N+1解消）
    const [allLogs, freezeByGoalId] = await Promise.all([
      tracer.span("db.prefetchActivityLogs", () =>
        prefetchActivityLogs(activityLogRepo, userId, goals, clientDate),
      ),
      tracer.span("db.prefetchFreezePeriods", () =>
        activityGoalService.prefetchFreezePeriods(userId, goals),
      ),
    ]);

    // 並行で計算処理（DBアクセスなし、prefetchedLogsを使用）
    const goalsWithBalance = await Promise.all(
      goals.map(async (goal) => {
        const [balance, inactiveDates] = await Promise.all([
          tracer.span("calculateCurrentBalance", () =>
            activityGoalService.calculateCurrentBalance(
              userId,
              goal,
              clientDate,
              allLogs,
              freezeByGoalId.get(goal.id) ?? [],
            ),
          ),
          tracer.span("getInactiveDates", () =>
            activityGoalService.getInactiveDates(
              userId,
              goal,
              allLogs,
              clientDate,
            ),
          ),
        ]);
        return goalEntityToResponse(goal, balance, inactiveDates);
      }),
    );

    // フィルタリング適用
    let filteredGoals = goalsWithBalance;
    if (filters?.activityId) {
      filteredGoals = filteredGoals.filter(
        (goal) => goal.activityId === filters.activityId,
      );
    }
    if (filters?.isActive !== undefined) {
      filteredGoals = filteredGoals.filter(
        (goal) => goal.isActive === filters.isActive,
      );
    }

    return filteredGoals.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  };
}

function getGoal(
  activityGoalRepo: ActivityGoalRepository,
  activityGoalService: ActivityGoalService,
  tracer: Tracer,
) {
  return async (
    userId: UserId,
    goalId: string,
    clientDate: string,
  ): Promise<Goal> => {
    const goal = await tracer.span("db.getActivityGoalByIdAndUserId", () =>
      activityGoalRepo.getActivityGoalByIdAndUserId(
        createActivityGoalId(goalId),
        userId,
      ),
    );
    if (!goal) throw new ResourceNotFoundError("Goal not found");

    const [balance, inactiveDates] = await Promise.all([
      tracer.span("db.calculateCurrentBalance", () =>
        activityGoalService.calculateCurrentBalance(userId, goal, clientDate),
      ),
      tracer.span("db.getInactiveDates", () =>
        activityGoalService.getInactiveDates(
          userId,
          goal,
          undefined,
          clientDate,
        ),
      ),
    ]);
    return goalEntityToResponse(goal, balance, inactiveDates);
  };
}

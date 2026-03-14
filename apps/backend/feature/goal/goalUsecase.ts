import { ResourceNotFoundError } from "@backend/error";
import type { Tracer } from "@backend/lib/tracer";
import type { ActivityId } from "@packages/domain/activity/activitySchema";
import type { DayTargets } from "@packages/domain/goal/dayTargets";
import { parseDayTargets } from "@packages/domain/goal/dayTargets";
import {
  type ActivityGoal,
  type ActivityGoalId,
  createActivityGoalEntity,
  createActivityGoalId,
} from "@packages/domain/goal/goalSchema";
import type { UserId } from "@packages/domain/user/userSchema";

import type { ActivityGoalRepository } from "../activitygoal/activityGoalRepository";
import type { ActivityGoalService } from "../activitygoal/activityGoalService";
import { prefetchActivityLogs } from "../activitygoal/activityGoalService";
import type { ActivityLogRepository } from "../activityLog";

export type Goal = {
  id: string;
  userId: string;
  activityId: string;
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
  dailyTargetQuantity: number;
  startDate: string;
  endDate?: string;
  currentBalance: number;
  totalTarget: number;
  totalActual: number;
  inactiveDates: string[];
  debtCap?: number | null;
  dayTargets?: DayTargets | null;
};

export type CreateGoalRequest = {
  activityId: string;
  dailyTargetQuantity: number;
  startDate: string;
  endDate?: string;
  description?: string;
  debtCap?: number | null;
  dayTargets?: Record<string, number> | null;
};

export type UpdateGoalRequest = {
  dailyTargetQuantity?: number;
  startDate?: string;
  endDate?: string | null;
  description?: string | null;
  isActive?: boolean;
  debtCap?: number | null;
  dayTargets?: Record<string, number> | null;
};

export type GoalFilters = {
  activityId?: string;
  isActive?: boolean;
};

export type GoalUsecase = {
  getGoals(userId: UserId, filters?: GoalFilters): Promise<Goal[]>;
  getGoal(userId: UserId, goalId: string): Promise<Goal>;
  createGoal(userId: UserId, req: CreateGoalRequest): Promise<Goal>;
  updateGoal(
    userId: UserId,
    goalId: string,
    req: UpdateGoalRequest,
  ): Promise<Goal>;
  deleteGoal(userId: UserId, goalId: string): Promise<void>;
};

export function newGoalUsecase(
  activityGoalRepo: ActivityGoalRepository,
  activityGoalService: ActivityGoalService,
  activityLogRepo: ActivityLogRepository,
  tracer: Tracer,
): GoalUsecase {
  return {
    getGoals: getGoals(
      activityGoalRepo,
      activityGoalService,
      activityLogRepo,
      tracer,
    ),
    getGoal: getGoal(activityGoalRepo, activityGoalService, tracer),
    createGoal: createGoal(activityGoalRepo, tracer),
    updateGoal: updateGoal(activityGoalRepo, tracer),
    deleteGoal: deleteGoal(activityGoalRepo, tracer),
  };
}

function goalEntityToResponse(
  goal: ActivityGoal,
  balance: { currentBalance: number; totalTarget: number; totalActual: number },
  inactiveDates: string[],
): Goal {
  return {
    id: goal.id,
    userId: goal.userId,
    activityId: goal.activityId,
    isActive: goal.isActive,
    description: goal.description || undefined,
    createdAt:
      goal.type === "persisted"
        ? goal.createdAt.toISOString()
        : new Date().toISOString(),
    updatedAt:
      goal.type === "persisted"
        ? goal.updatedAt.toISOString()
        : new Date().toISOString(),
    dailyTargetQuantity: goal.dailyTargetQuantity,
    startDate: goal.startDate,
    endDate: goal.endDate || undefined,
    currentBalance: balance.currentBalance,
    totalTarget: balance.totalTarget,
    totalActual: balance.totalActual,
    inactiveDates,
    debtCap: goal.debtCap ?? null,
    dayTargets: goal.dayTargets ?? null,
  };
}

function getGoals(
  activityGoalRepo: ActivityGoalRepository,
  activityGoalService: ActivityGoalService,
  activityLogRepo: ActivityLogRepository,
  tracer: Tracer,
) {
  return async (userId: UserId, filters?: GoalFilters): Promise<Goal[]> => {
    const goals = await tracer.span("db.getActivityGoalsByUserId", () =>
      activityGoalRepo.getActivityGoalsByUserId(userId),
    );

    // activity-logsを1回だけ一括取得（N+1解消）
    const allLogs = await tracer.span("db.prefetchActivityLogs", () =>
      prefetchActivityLogs(activityLogRepo, userId, goals),
    );

    // 並行で計算処理（DBアクセスなし、prefetchedLogsを使用）
    const goalsWithBalance = await Promise.all(
      goals.map(async (goal) => {
        const [balance, inactiveDates] = await Promise.all([
          tracer.span("calculateCurrentBalance", () =>
            activityGoalService.calculateCurrentBalance(
              userId,
              goal,
              undefined,
              allLogs,
            ),
          ),
          tracer.span("getInactiveDates", () =>
            activityGoalService.getInactiveDates(userId, goal, allLogs),
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
  return async (userId: UserId, goalId: string): Promise<Goal> => {
    const goal = await tracer.span("db.getActivityGoalByIdAndUserId", () =>
      activityGoalRepo.getActivityGoalByIdAndUserId(
        goalId as ActivityGoalId,
        userId,
      ),
    );
    if (!goal) throw new ResourceNotFoundError("Goal not found");

    const [balance, inactiveDates] = await Promise.all([
      tracer.span("db.calculateCurrentBalance", () =>
        activityGoalService.calculateCurrentBalance(userId, goal),
      ),
      tracer.span("db.getInactiveDates", () =>
        activityGoalService.getInactiveDates(userId, goal),
      ),
    ]);
    return goalEntityToResponse(goal, balance, inactiveDates);
  };
}

function createGoal(activityGoalRepo: ActivityGoalRepository, tracer: Tracer) {
  return async (userId: UserId, req: CreateGoalRequest): Promise<Goal> => {
    const goal = createActivityGoalEntity({
      type: "new",
      id: createActivityGoalId(),
      userId,
      activityId: req.activityId as ActivityId,
      dailyTargetQuantity: req.dailyTargetQuantity,
      startDate: req.startDate,
      endDate: req.endDate || null,
      isActive: true,
      description: req.description || null,
      debtCap: req.debtCap ?? null,
      dayTargets: parseDayTargets(req.dayTargets),
    });

    const created = await tracer.span("db.createActivityGoal", () =>
      activityGoalRepo.createActivityGoal(goal),
    );

    return goalEntityToResponse(
      created,
      { currentBalance: 0, totalTarget: 0, totalActual: 0 },
      [],
    );
  };
}

function updateGoal(activityGoalRepo: ActivityGoalRepository, tracer: Tracer) {
  return async (
    userId: UserId,
    goalId: string,
    req: UpdateGoalRequest,
  ): Promise<Goal> => {
    const goal = await tracer.span("db.getActivityGoalByIdAndUserId", () =>
      activityGoalRepo.getActivityGoalByIdAndUserId(
        goalId as ActivityGoalId,
        userId,
      ),
    );
    if (!goal) throw new ResourceNotFoundError("Goal not found");

    const updated = createActivityGoalEntity({
      ...goal,
      dailyTargetQuantity: req.dailyTargetQuantity ?? goal.dailyTargetQuantity,
      startDate: req.startDate ?? goal.startDate,
      endDate: req.endDate === null ? null : (req.endDate ?? goal.endDate),
      description:
        req.description === null ? null : (req.description ?? goal.description),
      isActive: req.isActive ?? goal.isActive,
      debtCap: req.debtCap === null ? null : (req.debtCap ?? goal.debtCap),
      dayTargets:
        req.dayTargets === null
          ? null
          : req.dayTargets
            ? parseDayTargets(req.dayTargets)
            : goal.dayTargets,
    });

    const saved = await tracer.span("db.updateActivityGoal", () =>
      activityGoalRepo.updateActivityGoal(updated),
    );

    return goalEntityToResponse(
      saved,
      { currentBalance: 0, totalTarget: 0, totalActual: 0 },
      [],
    );
  };
}

function deleteGoal(activityGoalRepo: ActivityGoalRepository, tracer: Tracer) {
  return async (userId: UserId, goalId: string): Promise<void> => {
    const goal = await tracer.span("db.getActivityGoalByIdAndUserId", () =>
      activityGoalRepo.getActivityGoalByIdAndUserId(
        goalId as ActivityGoalId,
        userId,
      ),
    );
    if (!goal) throw new ResourceNotFoundError("Goal not found");

    await tracer.span("db.deleteActivityGoal", () =>
      activityGoalRepo.deleteActivityGoal(goal),
    );
  };
}

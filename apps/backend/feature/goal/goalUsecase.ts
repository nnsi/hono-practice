import {
  type ActivityGoalId,
  type ActivityId,
  type UserId,
  createActivityGoalEntity,
  createActivityGoalId,
} from "@backend/domain";
import { ResourceNotFoundError } from "@backend/error";
import type { Tracer } from "@backend/lib/tracer";

import type { ActivityGoalRepository } from "../activitygoal/activityGoalRepository";
import type { ActivityGoalService } from "../activitygoal/activityGoalService";

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
  currentBalance: number; // 現在の進捗バランス
  totalTarget: number; // 累積目標量
  totalActual: number; // 累積実績
  inactiveDates: string[]; // やらなかった日付のリスト
};

export type CreateGoalRequest = {
  activityId: string;
  dailyTargetQuantity: number;
  startDate: string;
  endDate?: string;
  description?: string;
};

export type UpdateGoalRequest = {
  dailyTargetQuantity?: number;
  startDate?: string;
  endDate?: string | null;
  description?: string | null;
  isActive?: boolean;
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
  tracer: Tracer,
): GoalUsecase {
  return {
    getGoals: getGoals(activityGoalRepo, activityGoalService, tracer),
    getGoal: getGoal(activityGoalRepo, activityGoalService, tracer),
    createGoal: createGoal(activityGoalRepo, tracer),
    updateGoal: updateGoal(activityGoalRepo, tracer),
    deleteGoal: deleteGoal(activityGoalRepo, tracer),
  };
}

function getGoals(
  activityGoalRepo: ActivityGoalRepository,
  activityGoalService: ActivityGoalService,
  tracer: Tracer,
) {
  return async (userId: UserId, filters?: GoalFilters): Promise<Goal[]> => {
    const goals = await tracer.span("db.getActivityGoalsByUserId", () =>
      activityGoalRepo.getActivityGoalsByUserId(userId),
    );

    // 並行で計算処理
    const goalsWithBalance = await Promise.all(
      goals.map(async (goal) => {
        const [balance, inactiveDates] = await Promise.all([
          tracer.span("db.calculateCurrentBalance", () =>
            activityGoalService.calculateCurrentBalance(userId, goal),
          ),
          tracer.span("db.getInactiveDates", () =>
            activityGoalService.getInactiveDates(userId, goal),
          ),
        ]);
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
        } satisfies Goal;
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
    };
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
    });

    const created = await tracer.span("db.createActivityGoal", () =>
      activityGoalRepo.createActivityGoal(goal),
    );

    return {
      id: created.id,
      userId: created.userId,
      activityId: created.activityId,
      isActive: created.isActive,
      description: created.description || undefined,
      createdAt:
        created.type === "persisted"
          ? created.createdAt.toISOString()
          : new Date().toISOString(),
      updatedAt:
        created.type === "persisted"
          ? created.updatedAt.toISOString()
          : new Date().toISOString(),
      dailyTargetQuantity: created.dailyTargetQuantity,
      startDate: created.startDate,
      endDate: created.endDate || undefined,
      currentBalance: 0,
      totalTarget: 0,
      totalActual: 0,
      inactiveDates: [], // 新規作成時は空配列
    };
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
    });

    const saved = await tracer.span("db.updateActivityGoal", () =>
      activityGoalRepo.updateActivityGoal(updated),
    );

    return {
      id: saved.id,
      userId: saved.userId,
      activityId: saved.activityId,
      isActive: saved.isActive,
      description: saved.description || undefined,
      createdAt:
        saved.type === "persisted"
          ? saved.createdAt.toISOString()
          : new Date().toISOString(),
      updatedAt:
        saved.type === "persisted"
          ? saved.updatedAt.toISOString()
          : new Date().toISOString(),
      dailyTargetQuantity: saved.dailyTargetQuantity,
      startDate: saved.startDate,
      endDate: saved.endDate || undefined,
      currentBalance: 0,
      totalTarget: 0,
      totalActual: 0,
      inactiveDates: [], // 更新時は一旦空配列
    };
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

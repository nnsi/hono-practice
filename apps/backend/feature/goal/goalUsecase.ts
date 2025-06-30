import {
  type ActivityDebtId,
  type ActivityGoalId,
  type ActivityId,
  type UserId,
  createActivityDebtEntity,
  createActivityDebtId,
  createActivityGoalEntity,
  createActivityGoalId,
} from "@backend/domain";
import { ResourceNotFoundError } from "@backend/error";

import type { ActivityDebtRepository } from "../activitydebt/activityDebtRepository";
import type { ActivityDebtService } from "../activitydebt/activityDebtService";
import type { ActivityGoalRepository } from "../activitygoal/activityGoalRepository";
import type { ActivityGoalService } from "../activitygoal/activityGoalService";

// 統合Goal型の定義
export type GoalType = "debt" | "monthly_target";

export type BaseGoal = {
  id: string;
  userId: string;
  activityId: string;
  type: GoalType;
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
};

export type DebtGoal = BaseGoal & {
  type: "debt";
  dailyTargetQuantity: number;
  startDate: string;
  endDate?: string;
  currentBalance: number; // 現在の残高
  totalDebt: number; // 累積負債
  totalActual: number; // 累積実績
};

export type MonthlyTargetGoal = BaseGoal & {
  type: "monthly_target";
  targetMonth: string; // YYYY-MM
  targetQuantity: number;
  currentQuantity: number; // 現在の実績
  progressRate: number; // 進捗率
  isAchieved: boolean;
};

export type Goal = DebtGoal | MonthlyTargetGoal;

export type CreateDebtGoalRequest = {
  activityId: string;
  dailyTargetQuantity: number;
  startDate: string;
  endDate?: string;
  description?: string;
};

export type CreateMonthlyGoalRequest = {
  activityId: string;
  targetMonth: string;
  targetQuantity: number;
  description?: string;
};

export type UpdateDebtGoalRequest = {
  dailyTargetQuantity?: number;
  startDate?: string;
  endDate?: string | null;
  description?: string | null;
  isActive?: boolean;
};

export type UpdateMonthlyGoalRequest = {
  targetMonth?: string;
  targetQuantity?: number;
  description?: string | null;
};

export type UpdateGoalRequest =
  | UpdateDebtGoalRequest
  | UpdateMonthlyGoalRequest;

export type GoalFilters = {
  activityId?: string;
  type?: GoalType;
  isActive?: boolean;
};

export type GoalUsecase = {
  // 統合API
  getGoals(userId: UserId, filters?: GoalFilters): Promise<Goal[]>;
  getGoal(userId: UserId, goalId: string, type: GoalType): Promise<Goal>;

  // 個別作成API
  createDebtGoal(userId: UserId, req: CreateDebtGoalRequest): Promise<DebtGoal>;
  createMonthlyGoal(
    userId: UserId,
    req: CreateMonthlyGoalRequest,
  ): Promise<MonthlyTargetGoal>;

  // 更新・削除API
  updateGoal(
    userId: UserId,
    goalId: string,
    type: GoalType,
    req: UpdateGoalRequest,
  ): Promise<Goal>;
  deleteGoal(userId: UserId, goalId: string, type: GoalType): Promise<void>;
};

export function newGoalUsecase(
  activityDebtRepo: ActivityDebtRepository,
  activityGoalRepo: ActivityGoalRepository,
  activityDebtService: ActivityDebtService,
  activityGoalService: ActivityGoalService,
): GoalUsecase {
  return {
    getGoals: getGoals(
      activityDebtRepo,
      activityGoalRepo,
      activityDebtService,
      activityGoalService,
    ),
    getGoal: getGoal(
      activityDebtRepo,
      activityGoalRepo,
      activityDebtService,
      activityGoalService,
    ),
    createDebtGoal: createDebtGoal(activityDebtRepo),
    createMonthlyGoal: createMonthlyGoal(activityGoalRepo),
    updateGoal: updateGoal(activityDebtRepo, activityGoalRepo),
    deleteGoal: deleteGoal(activityDebtRepo, activityGoalRepo),
  };
}

function getGoals(
  activityDebtRepo: ActivityDebtRepository,
  activityGoalRepo: ActivityGoalRepository,
  activityDebtService: ActivityDebtService,
  activityGoalService: ActivityGoalService,
) {
  return async (userId: UserId, filters?: GoalFilters): Promise<Goal[]> => {
    // 両方のRepositoryから並行取得
    const [debts, monthlyGoals] = await Promise.all([
      activityDebtRepo.getByUserId(userId),
      activityGoalRepo.getByUserId(userId),
    ]);

    // 並行で計算処理
    const [debtGoals, monthlyTargetGoals] = await Promise.all([
      Promise.all(
        debts.map(async (debt) => {
          const balance = await activityDebtService.calculateCurrentBalance(
            userId,
            debt,
          );
          return {
            id: debt.id,
            userId: debt.userId,
            activityId: debt.activityId,
            type: "debt" as const,
            isActive: debt.isActive,
            description: debt.description || undefined,
            createdAt:
              debt.type === "persisted"
                ? debt.createdAt.toISOString()
                : new Date().toISOString(),
            updatedAt:
              debt.type === "persisted"
                ? debt.updatedAt.toISOString()
                : new Date().toISOString(),
            dailyTargetQuantity: debt.dailyTargetQuantity,
            startDate: debt.startDate,
            endDate: debt.endDate || undefined,
            currentBalance: balance.currentBalance,
            totalDebt: balance.totalDebt,
            totalActual: balance.totalActual,
          } satisfies DebtGoal;
        }),
      ),
      Promise.all(
        monthlyGoals.map(async (goal) => {
          const progress = await activityGoalService.calculateProgress(
            userId,
            goal,
          );
          return {
            id: goal.id,
            userId: goal.userId,
            activityId: goal.activityId,
            type: "monthly_target" as const,
            isActive: true, // 月間目標は基本的に常にアクティブ
            description: goal.description || undefined,
            createdAt:
              goal.type === "persisted"
                ? goal.createdAt.toISOString()
                : new Date().toISOString(),
            updatedAt:
              goal.type === "persisted"
                ? goal.updatedAt.toISOString()
                : new Date().toISOString(),
            targetMonth: goal.targetMonth,
            targetQuantity: goal.targetQuantity,
            currentQuantity: progress.currentQuantity,
            progressRate: progress.progressRate,
            isAchieved: progress.isAchieved,
          } satisfies MonthlyTargetGoal;
        }),
      ),
    ]);

    // 統合してソート（作成日時順など）
    const allGoals = [...debtGoals, ...monthlyTargetGoals];

    // フィルタリング適用
    if (filters) {
      return applyGoalFilters(allGoals, filters);
    }

    return allGoals.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  };
}

function getGoal(
  activityDebtRepo: ActivityDebtRepository,
  activityGoalRepo: ActivityGoalRepository,
  activityDebtService: ActivityDebtService,
  activityGoalService: ActivityGoalService,
) {
  return async (
    userId: UserId,
    goalId: string,
    type: GoalType,
  ): Promise<Goal> => {
    if (type === "debt") {
      const debt = await activityDebtRepo.getByIdAndUserId(
        goalId as ActivityDebtId,
        userId,
      );
      if (!debt) throw new ResourceNotFoundError("Debt goal not found");

      const balance = await activityDebtService.calculateCurrentBalance(
        userId,
        debt,
      );
      return {
        id: debt.id,
        userId: debt.userId,
        activityId: debt.activityId,
        type: "debt" as const,
        isActive: debt.isActive,
        description: debt.description || undefined,
        createdAt:
          debt.type === "persisted"
            ? debt.createdAt.toISOString()
            : new Date().toISOString(),
        updatedAt:
          debt.type === "persisted"
            ? debt.updatedAt.toISOString()
            : new Date().toISOString(),
        dailyTargetQuantity: debt.dailyTargetQuantity,
        startDate: debt.startDate,
        endDate: debt.endDate || undefined,
        currentBalance: balance.currentBalance,
        totalDebt: balance.totalDebt,
        totalActual: balance.totalActual,
      } satisfies DebtGoal;
    }

    const goal = await activityGoalRepo.getByIdAndUserId(
      goalId as ActivityGoalId,
      userId,
    );
    if (!goal) throw new ResourceNotFoundError("Monthly goal not found");

    const progress = await activityGoalService.calculateProgress(userId, goal);
    return {
      id: goal.id,
      userId: goal.userId,
      activityId: goal.activityId,
      type: "monthly_target" as const,
      isActive: true,
      description: goal.description || undefined,
      createdAt:
        goal.type === "persisted"
          ? goal.createdAt.toISOString()
          : new Date().toISOString(),
      updatedAt:
        goal.type === "persisted"
          ? goal.updatedAt.toISOString()
          : new Date().toISOString(),
      targetMonth: goal.targetMonth,
      targetQuantity: goal.targetQuantity,
      currentQuantity: progress.currentQuantity,
      progressRate: progress.progressRate,
      isAchieved: progress.isAchieved,
    } satisfies MonthlyTargetGoal;
  };
}

function createDebtGoal(activityDebtRepo: ActivityDebtRepository) {
  return async (
    userId: UserId,
    req: CreateDebtGoalRequest,
  ): Promise<DebtGoal> => {
    const debt = createActivityDebtEntity({
      type: "new",
      id: createActivityDebtId(),
      userId,
      activityId: req.activityId as ActivityId,
      dailyTargetQuantity: req.dailyTargetQuantity,
      startDate: req.startDate,
      endDate: req.endDate || null,
      isActive: true,
      description: req.description || null,
    });

    const createdDebt = await activityDebtRepo.create(debt);

    return {
      id: createdDebt.id,
      userId: createdDebt.userId,
      activityId: createdDebt.activityId,
      type: "debt" as const,
      isActive: createdDebt.isActive,
      description: createdDebt.description || undefined,
      createdAt:
        createdDebt.type === "persisted"
          ? createdDebt.createdAt.toISOString()
          : new Date().toISOString(),
      updatedAt:
        createdDebt.type === "persisted"
          ? createdDebt.updatedAt.toISOString()
          : new Date().toISOString(),
      dailyTargetQuantity: createdDebt.dailyTargetQuantity,
      startDate: createdDebt.startDate,
      endDate: createdDebt.endDate || undefined,
      currentBalance: 0, // 新規作成時は0
      totalDebt: 0,
      totalActual: 0,
    };
  };
}

function createMonthlyGoal(activityGoalRepo: ActivityGoalRepository) {
  return async (
    userId: UserId,
    req: CreateMonthlyGoalRequest,
  ): Promise<MonthlyTargetGoal> => {
    const goal = createActivityGoalEntity({
      type: "new",
      id: createActivityGoalId(),
      userId,
      activityId: req.activityId as ActivityId,
      targetMonth: req.targetMonth,
      targetQuantity: req.targetQuantity,
      description: req.description || null,
    });

    const createdGoal = await activityGoalRepo.create(goal);

    return {
      id: createdGoal.id,
      userId: createdGoal.userId,
      activityId: createdGoal.activityId,
      type: "monthly_target" as const,
      isActive: true,
      description: createdGoal.description || undefined,
      createdAt:
        createdGoal.type === "persisted"
          ? createdGoal.createdAt.toISOString()
          : new Date().toISOString(),
      updatedAt:
        createdGoal.type === "persisted"
          ? createdGoal.updatedAt.toISOString()
          : new Date().toISOString(),
      targetMonth: createdGoal.targetMonth,
      targetQuantity: createdGoal.targetQuantity,
      currentQuantity: 0, // 新規作成時は0
      progressRate: 0,
      isAchieved: false,
    };
  };
}

function updateGoal(
  activityDebtRepo: ActivityDebtRepository,
  activityGoalRepo: ActivityGoalRepository,
) {
  return async (
    userId: UserId,
    goalId: string,
    type: GoalType,
    req: UpdateGoalRequest,
  ): Promise<Goal> => {
    if (type === "debt") {
      const existingDebt = await activityDebtRepo.getByIdAndUserId(
        goalId as ActivityDebtId,
        userId,
      );
      if (!existingDebt) {
        throw new ResourceNotFoundError("Debt goal not found");
      }

      const debtReq = req as UpdateDebtGoalRequest;
      const updatedDebt = createActivityDebtEntity({
        ...existingDebt,
        dailyTargetQuantity:
          debtReq.dailyTargetQuantity ?? existingDebt.dailyTargetQuantity,
        startDate: debtReq.startDate ?? existingDebt.startDate,
        endDate:
          debtReq.endDate !== undefined
            ? debtReq.endDate
            : existingDebt.endDate,
        description:
          debtReq.description !== undefined
            ? debtReq.description
            : existingDebt.description,
        isActive: debtReq.isActive ?? existingDebt.isActive,
        type: "persisted",
        createdAt:
          existingDebt.type === "persisted"
            ? existingDebt.createdAt
            : new Date(),
        updatedAt: new Date(),
      });

      const result = await activityDebtRepo.update(updatedDebt);

      return {
        id: result.id,
        userId: result.userId,
        activityId: result.activityId,
        type: "debt" as const,
        isActive: result.isActive,
        description: result.description || undefined,
        createdAt:
          result.type === "persisted"
            ? result.createdAt.toISOString()
            : new Date().toISOString(),
        updatedAt:
          result.type === "persisted"
            ? result.updatedAt.toISOString()
            : new Date().toISOString(),
        dailyTargetQuantity: result.dailyTargetQuantity,
        startDate: result.startDate,
        endDate: result.endDate || undefined,
        currentBalance: 0, // Will be recalculated by service
        totalDebt: 0,
        totalActual: 0,
      } satisfies DebtGoal;
    }

    // Monthly goal update
    const existingGoal = await activityGoalRepo.getByIdAndUserId(
      goalId as ActivityGoalId,
      userId,
    );
    if (!existingGoal) {
      throw new ResourceNotFoundError("Monthly goal not found");
    }

    const monthlyReq = req as UpdateMonthlyGoalRequest;
    const updatedGoal = createActivityGoalEntity({
      ...existingGoal,
      targetMonth: monthlyReq.targetMonth ?? existingGoal.targetMonth,
      targetQuantity: monthlyReq.targetQuantity ?? existingGoal.targetQuantity,
      description:
        monthlyReq.description !== undefined
          ? monthlyReq.description
          : existingGoal.description,
      type: "persisted",
      createdAt:
        existingGoal.type === "persisted" ? existingGoal.createdAt : new Date(),
      updatedAt: new Date(),
    });

    const result = await activityGoalRepo.update(updatedGoal);

    return {
      id: result.id,
      userId: result.userId,
      activityId: result.activityId,
      type: "monthly_target" as const,
      isActive: true,
      description: result.description || undefined,
      createdAt:
        result.type === "persisted"
          ? result.createdAt.toISOString()
          : new Date().toISOString(),
      updatedAt:
        result.type === "persisted"
          ? result.updatedAt.toISOString()
          : new Date().toISOString(),
      targetMonth: result.targetMonth,
      targetQuantity: result.targetQuantity,
      currentQuantity: 0, // Will be recalculated by service
      progressRate: 0,
      isAchieved: false,
    } satisfies MonthlyTargetGoal;
  };
}

function deleteGoal(
  activityDebtRepo: ActivityDebtRepository,
  activityGoalRepo: ActivityGoalRepository,
) {
  return async (
    userId: UserId,
    goalId: string,
    type: GoalType,
  ): Promise<void> => {
    if (type === "debt") {
      const existingDebt = await activityDebtRepo.getByIdAndUserId(
        goalId as ActivityDebtId,
        userId,
      );
      if (!existingDebt) {
        throw new ResourceNotFoundError("Debt goal not found");
      }

      await activityDebtRepo.delete(existingDebt);
      return;
    }

    // Monthly goal delete
    const existingGoal = await activityGoalRepo.getByIdAndUserId(
      goalId as ActivityGoalId,
      userId,
    );
    if (!existingGoal) {
      throw new ResourceNotFoundError("Monthly goal not found");
    }

    await activityGoalRepo.delete(existingGoal);
  };
}

// Helper function: フィルタリング
function applyGoalFilters(goals: Goal[], filters: GoalFilters): Goal[] {
  return goals.filter((goal) => {
    if (filters.activityId && goal.activityId !== filters.activityId)
      return false;
    if (filters.type && goal.type !== filters.type) return false;
    if (filters.isActive !== undefined && goal.isActive !== filters.isActive)
      return false;
    return true;
  });
}

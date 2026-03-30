import type { DayTargets } from "@packages/domain/goal/dayTargets";
import type { ActivityGoal } from "@packages/domain/goal/goalSchema";
import type { UserId } from "@packages/domain/user/userSchema";

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
  getGoals(
    userId: UserId,
    filters?: GoalFilters,
    clientDate?: string,
  ): Promise<Goal[]>;
  getGoal(userId: UserId, goalId: string, clientDate?: string): Promise<Goal>;
  createGoal(userId: UserId, req: CreateGoalRequest): Promise<Goal>;
  updateGoal(
    userId: UserId,
    goalId: string,
    req: UpdateGoalRequest,
  ): Promise<Goal>;
  deleteGoal(userId: UserId, goalId: string): Promise<void>;
};

export function goalEntityToResponse(
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

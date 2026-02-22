import { apiFetch } from "../utils/apiClient";
import type { CreateGoalPayload, Goal, GoalStats, UpdateGoalPayload } from "../components/goal/types";

// API responses may use snake_case or camelCase
type ApiGoal = {
  id: string;
  userId?: string;
  user_id?: string;
  activityId?: string;
  activity_id?: string;
  dailyTargetQuantity?: number;
  daily_target_quantity?: number;
  startDate?: string;
  start_date?: string;
  endDate?: string;
  end_date?: string;
  isActive?: boolean;
  is_active?: boolean;
  description?: string;
  currentBalance?: number;
  current_balance?: number;
  totalTarget?: number;
  total_target?: number;
  totalActual?: number;
  total_actual?: number;
  inactiveDates?: string[];
  inactive_dates?: string[];
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
};

export function normalizeGoal(g: ApiGoal): Goal {
  return {
    id: g.id,
    userId: g.userId ?? g.user_id ?? "",
    activityId: g.activityId ?? g.activity_id ?? "",
    dailyTargetQuantity: Number(g.dailyTargetQuantity ?? g.daily_target_quantity ?? 0),
    startDate: g.startDate ?? g.start_date ?? "",
    endDate: g.endDate ?? g.end_date,
    isActive: g.isActive ?? g.is_active ?? true,
    description: g.description ?? "",
    currentBalance: Number(g.currentBalance ?? g.current_balance ?? 0),
    totalTarget: Number(g.totalTarget ?? g.total_target ?? 0),
    totalActual: Number(g.totalActual ?? g.total_actual ?? 0),
    inactiveDates: g.inactiveDates ?? g.inactive_dates ?? [],
    createdAt: g.createdAt ?? g.created_at ?? "",
    updatedAt: g.updatedAt ?? g.updated_at ?? "",
  };
}

export async function fetchGoals(): Promise<Goal[]> {
  const res = await apiFetch("/users/goals");
  if (!res.ok) throw new Error("Failed to fetch goals");
  const data = await res.json();
  const goals: ApiGoal[] = data.goals ?? data;
  return goals.map(normalizeGoal);
}

export async function fetchGoalStats(goalId: string): Promise<GoalStats> {
  const res = await apiFetch(`/users/goals/${goalId}/stats`);
  if (!res.ok) throw new Error("Failed to fetch goal stats");
  return await res.json();
}

export async function createGoalApi(payload: CreateGoalPayload): Promise<Goal> {
  const res = await apiFetch("/users/goals", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create goal");
  const data: ApiGoal = await res.json();
  return normalizeGoal(data);
}

export async function updateGoalApi(goalId: string, payload: UpdateGoalPayload): Promise<Goal> {
  const res = await apiFetch(`/users/goals/${goalId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update goal");
  const data: ApiGoal = await res.json();
  return normalizeGoal(data);
}

export async function deleteGoalApi(goalId: string): Promise<void> {
  const res = await apiFetch(`/users/goals/${goalId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete goal");
}

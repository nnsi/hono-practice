import { apiFetch } from "../../utils/apiClient";
import type { CreateGoalPayload, Goal, GoalStats, UpdateGoalPayload } from "./types";

export function normalizeGoal(g: Record<string, unknown>): Goal {
  return {
    id: g.id as string,
    userId: (g.userId ?? g.user_id) as string,
    activityId: (g.activityId ?? g.activity_id) as string,
    dailyTargetQuantity: Number(g.dailyTargetQuantity ?? g.daily_target_quantity),
    startDate: (g.startDate ?? g.start_date) as string,
    endDate: (g.endDate ?? g.end_date) as string | undefined,
    isActive: (g.isActive ?? g.is_active) as boolean,
    description: (g.description ?? "") as string,
    currentBalance: Number(g.currentBalance ?? g.current_balance ?? 0),
    totalTarget: Number(g.totalTarget ?? g.total_target ?? 0),
    totalActual: Number(g.totalActual ?? g.total_actual ?? 0),
    inactiveDates: (g.inactiveDates ?? g.inactive_dates ?? []) as string[],
    createdAt: (g.createdAt ?? g.created_at) as string,
    updatedAt: (g.updatedAt ?? g.updated_at) as string,
  };
}

export async function fetchGoals(): Promise<Goal[]> {
  const res = await apiFetch("/users/goals");
  if (!res.ok) throw new Error("Failed to fetch goals");
  const data = await res.json();
  const goals = data.goals ?? data;
  return (goals as Record<string, unknown>[]).map(normalizeGoal);
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
  const data = await res.json();
  return normalizeGoal(data);
}

export async function updateGoalApi(goalId: string, payload: UpdateGoalPayload): Promise<Goal> {
  const res = await apiFetch(`/users/goals/${goalId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update goal");
  const data = await res.json();
  return normalizeGoal(data);
}

export async function deleteGoalApi(goalId: string): Promise<void> {
  const res = await apiFetch(`/users/goals/${goalId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete goal");
}

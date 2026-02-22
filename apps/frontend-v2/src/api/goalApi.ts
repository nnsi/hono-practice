import { apiFetch } from "../utils/apiClient";
import type { GoalStats } from "../components/goal/types";

export async function fetchGoalStats(goalId: string): Promise<GoalStats> {
  const res = await apiFetch(`/users/goals/${goalId}/stats`);
  if (!res.ok) throw new Error("Failed to fetch goal stats");
  return await res.json();
}

export type GoalFilters = {
  type?: "debt" | "monthly_target";
  activityId?: string;
  isActive?: boolean;
};

export function buildGoalQueryString(filters?: GoalFilters): string {
  if (!filters) return "";

  const params = new URLSearchParams();

  if (filters.type) params.append("type", filters.type);
  if (filters.activityId) params.append("activityId", filters.activityId);
  if (filters.isActive !== undefined)
    params.append("isActive", filters.isActive.toString());

  return params.toString();
}

export function buildGoalPath(filters?: GoalFilters): string {
  const queryString = buildGoalQueryString(filters);
  return queryString ? `/users/goals?${queryString}` : "/users/goals";
}

export function calculateDebtBalance(
  current: number,
  target: number,
): {
  balance: number;
  status: "debt" | "savings" | "neutral";
} {
  const balance = current - target;
  const status = balance < 0 ? "debt" : balance > 0 ? "savings" : "neutral";
  return { balance, status };
}

export function calculateMonthlyProgress(
  current: number,
  target: number,
  remainingDays: number,
): {
  progressPercentage: number;
  requiredDailyPace: number;
  isAchieved: boolean;
  status: "achieved" | "high" | "moderate" | "low";
} {
  const progressPercentage = target > 0 ? (current / target) * 100 : 0;
  const remaining = Math.max(0, target - current);
  const requiredDailyPace = remainingDays > 0 ? remaining / remainingDays : 0;
  const isAchieved = current >= target;

  let status: "achieved" | "high" | "moderate" | "low";
  if (isAchieved) {
    status = "achieved";
  } else if (progressPercentage >= 80) {
    status = "high";
  } else if (progressPercentage >= 50) {
    status = "moderate";
  } else {
    status = "low";
  }

  return {
    progressPercentage,
    requiredDailyPace,
    isAchieved,
    status,
  };
}

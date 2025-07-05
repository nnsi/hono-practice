export type GoalFilters = {
  activityId?: string;
  isActive?: boolean;
};

export function buildGoalQueryString(filters?: GoalFilters): string {
  if (!filters) return "";

  const params = new URLSearchParams();

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
  currentBalance: number,
  dailyTargetQuantity: number,
): {
  balance: number;
  status: "debt" | "savings" | "neutral";
  bgColor: string;
  borderColor: string;
  textColor: string;
  label: string;
} {
  const isInDebt = currentBalance < 0;
  const isSaving = currentBalance > 0;
  const absBalance = Math.abs(currentBalance);
  const daysCount = Math.ceil(absBalance / dailyTargetQuantity);

  if (isInDebt) {
    return {
      balance: currentBalance,
      status: "debt",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      textColor: "text-red-600",
      label: `${daysCount}日負債`,
    };
  }
  if (isSaving) {
    return {
      balance: currentBalance,
      status: "savings",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      textColor: "text-green-600",
      label: `${daysCount}日貯金`,
    };
  }
  // バランスがゼロの場合
  return {
    balance: currentBalance,
    status: "neutral",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    textColor: "text-gray-600",
    label: "バランス: 0",
  };
}

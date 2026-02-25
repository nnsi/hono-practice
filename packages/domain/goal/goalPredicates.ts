export function isGoalActive(goal: {
  isActive: boolean;
  deletedAt?: string | Date | null;
}): boolean {
  return goal.isActive && !goal.deletedAt;
}

export function isGoalEnded(
  goal: { endDate: string | null },
  today: string,
): boolean {
  return goal.endDate !== null && goal.endDate < today;
}

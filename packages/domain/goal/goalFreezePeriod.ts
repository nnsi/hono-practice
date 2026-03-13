export type GoalFreezePeriodRecord = {
  id: string;
  goalId: string;
  userId: string;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

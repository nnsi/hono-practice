export type Goal = {
  id: string;
  userId: string;
  activityId: string;
  dailyTargetQuantity: number;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  description?: string;
  currentBalance: number;
  totalTarget: number;
  totalActual: number;
  inactiveDates: string[];
  createdAt: string;
  updatedAt: string;
};

export type GoalStats = {
  goalId: string;
  startDate: string;
  endDate: string;
  dailyRecords: { date: string; quantity: number; achieved: boolean }[];
  stats: {
    average: number;
    max: number;
    maxConsecutiveDays: number;
    achievedDays: number;
  };
};

export type CreateGoalPayload = {
  activityId: string;
  dailyTargetQuantity: number;
  startDate: string;
  endDate?: string;
};

export type UpdateGoalPayload = {
  dailyTargetQuantity?: number;
  startDate?: string;
  endDate?: string | null;
  isActive?: boolean;
};

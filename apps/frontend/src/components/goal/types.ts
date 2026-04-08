export type {
  CreateGoalPayload,
  Goal,
  UpdateGoalPayload,
} from "@packages/frontend-shared/hooks/types";

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

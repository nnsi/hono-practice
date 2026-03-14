import type { DayTargets } from "./dayTargets";

export type GoalRecord = {
  id: string;
  userId: string;
  activityId: string;
  dailyTargetQuantity: number;
  dayTargets: DayTargets | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  description: string;
  debtCap: number | null;
  currentBalance: number;
  totalTarget: number;
  totalActual: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

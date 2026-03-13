export type Goal = {
  id: string;
  userId: string;
  activityId: string;
  dailyTargetQuantity: number;
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
};

export type CreateGoalPayload = {
  activityId: string;
  dailyTargetQuantity: number;
  startDate: string;
  endDate?: string;
  debtCap?: number | null;
};

export type UpdateGoalPayload = {
  dailyTargetQuantity?: number;
  startDate?: string;
  endDate?: string | null;
  isActive?: boolean;
  debtCap?: number | null;
};

export type {
  ActivityRecord,
  ActivityRecord as Activity,
} from "@packages/domain/activity/activityRecord";

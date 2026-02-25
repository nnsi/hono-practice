import type { GoalRecord } from "./goalRecord";
import type { Syncable } from "../sync/syncableRecord";

export type CreateGoalInput = {
  activityId: string;
  dailyTargetQuantity: number;
  startDate: string;
  endDate?: string | null;
  description?: string;
};

export type UpdateGoalInput = Partial<
  Pick<
    GoalRecord,
    "dailyTargetQuantity" | "startDate" | "endDate" | "isActive" | "description"
  >
>;

export type GoalRepository = {
  createGoal(input: CreateGoalInput): Promise<Syncable<GoalRecord>>;
  getAllGoals(): Promise<Syncable<GoalRecord>[]>;
  updateGoal(id: string, changes: UpdateGoalInput): Promise<void>;
  softDeleteGoal(id: string): Promise<void>;
  getPendingSyncGoals(): Promise<Syncable<GoalRecord>[]>;
  markGoalsSynced(ids: string[]): Promise<void>;
  markGoalsFailed(ids: string[]): Promise<void>;
  upsertGoalsFromServer(goals: GoalRecord[]): Promise<void>;
};

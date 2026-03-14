import type { Syncable } from "../sync/syncableRecord";
import type { DayTargets } from "./dayTargets";
import type { GoalRecord } from "./goalRecord";

export type CreateGoalInput = {
  activityId: string;
  dailyTargetQuantity: number;
  dayTargets?: DayTargets | null;
  startDate: string;
  endDate?: string | null;
  description?: string;
  debtCap?: number | null;
};

export type UpdateGoalInput = Partial<
  Pick<
    GoalRecord,
    | "dailyTargetQuantity"
    | "dayTargets"
    | "startDate"
    | "endDate"
    | "isActive"
    | "description"
    | "debtCap"
  >
>;

export type GoalRepository = {
  createGoal(input: CreateGoalInput): Promise<Syncable<GoalRecord>>;
  /** Returns goals sorted by startDate descending (newest first). */
  getAllGoals(): Promise<Syncable<GoalRecord>[]>;
  updateGoal(id: string, changes: UpdateGoalInput): Promise<void>;
  softDeleteGoal(id: string): Promise<void>;
  getPendingSyncGoals(): Promise<Syncable<GoalRecord>[]>;
  markGoalsSynced(ids: string[]): Promise<void>;
  markGoalsFailed(ids: string[]): Promise<void>;
  upsertGoalsFromServer(goals: GoalRecord[]): Promise<void>;
};

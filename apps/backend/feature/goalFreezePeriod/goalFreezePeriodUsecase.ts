import { ResourceNotFoundError } from "@backend/error";
import type { UserId } from "@packages/domain/user/userSchema";

import type {
  GoalFreezePeriodRecord,
  GoalFreezePeriodRepository,
} from "./goalFreezePeriodRepository";

export type FreezePeriod = {
  id: string;
  goalId: string;
  userId: string;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateFreezePeriodParams = {
  startDate: string;
  endDate: string | null;
};

export type UpdateFreezePeriodParams = {
  startDate?: string;
  endDate?: string | null;
};

export type GoalFreezePeriodUsecase = {
  getFreezePeriods(userId: UserId, goalId: string): Promise<FreezePeriod[]>;
  createFreezePeriod(
    userId: UserId,
    goalId: string,
    params: CreateFreezePeriodParams,
  ): Promise<FreezePeriod>;
  updateFreezePeriod(
    userId: UserId,
    goalId: string,
    id: string,
    params: UpdateFreezePeriodParams,
  ): Promise<FreezePeriod>;
  deleteFreezePeriod(userId: UserId, goalId: string, id: string): Promise<void>;
};

function recordToFreezePeriod(record: GoalFreezePeriodRecord): FreezePeriod {
  return {
    id: record.id,
    goalId: record.goalId,
    userId: record.userId,
    startDate: record.startDate,
    endDate: record.endDate,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function newGoalFreezePeriodUsecase(
  repo: GoalFreezePeriodRepository,
): GoalFreezePeriodUsecase {
  return {
    getFreezePeriods: getFreezePeriods(repo),
    createFreezePeriod: createFreezePeriod(repo),
    updateFreezePeriod: updateFreezePeriod(repo),
    deleteFreezePeriod: deleteFreezePeriod(repo),
  };
}

function getFreezePeriods(repo: GoalFreezePeriodRepository) {
  return async (userId: UserId, goalId: string): Promise<FreezePeriod[]> => {
    const isOwned = await repo.isGoalOwnedByUser(goalId, userId);
    if (!isOwned) throw new ResourceNotFoundError("Goal not found");

    const records = await repo.getFreezePeriodsByGoalId(userId, goalId);
    return records.map(recordToFreezePeriod);
  };
}

function createFreezePeriod(repo: GoalFreezePeriodRepository) {
  return async (
    userId: UserId,
    goalId: string,
    params: CreateFreezePeriodParams,
  ): Promise<FreezePeriod> => {
    const isOwned = await repo.isGoalOwnedByUser(goalId, userId);
    if (!isOwned) throw new ResourceNotFoundError("Goal not found");

    const record = await repo.createGoalFreezePeriod(
      userId,
      goalId,
      params.startDate,
      params.endDate,
    );
    return recordToFreezePeriod(record);
  };
}

function updateFreezePeriod(repo: GoalFreezePeriodRepository) {
  return async (
    userId: UserId,
    goalId: string,
    id: string,
    params: UpdateFreezePeriodParams,
  ): Promise<FreezePeriod> => {
    const existing = await repo.getFreezePeriodByIdAndUserId(id, userId);
    if (!existing) throw new ResourceNotFoundError("Freeze period not found");

    if (existing.goalId !== goalId) {
      throw new ResourceNotFoundError("Freeze period not found");
    }

    const record = await repo.updateGoalFreezePeriod(id, userId, {
      startDate: params.startDate,
      endDate: params.endDate,
    });
    return recordToFreezePeriod(record);
  };
}

function deleteFreezePeriod(repo: GoalFreezePeriodRepository) {
  return async (userId: UserId, goalId: string, id: string): Promise<void> => {
    const existing = await repo.getFreezePeriodByIdAndUserId(id, userId);
    if (!existing) throw new ResourceNotFoundError("Freeze period not found");

    if (existing.goalId !== goalId) {
      throw new ResourceNotFoundError("Freeze period not found");
    }

    await repo.deleteGoalFreezePeriod(id, userId);
  };
}

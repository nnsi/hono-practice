import { AppError, ResourceNotFoundError } from "@backend/error";
import type { Tracer } from "@backend/lib/tracer";
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

function assertFreezePeriodDateRange(
  startDate: string,
  endDate: string | null,
) {
  if (endDate !== null && endDate < startDate) {
    throw new AppError("endDate must be on or after startDate", 400);
  }
}

export function newGoalFreezePeriodUsecase(
  repo: GoalFreezePeriodRepository,
  tracer: Tracer,
): GoalFreezePeriodUsecase {
  return {
    getFreezePeriods: getFreezePeriods(repo, tracer),
    createFreezePeriod: createFreezePeriod(repo, tracer),
    updateFreezePeriod: updateFreezePeriod(repo, tracer),
    deleteFreezePeriod: deleteFreezePeriod(repo, tracer),
  };
}

function getFreezePeriods(repo: GoalFreezePeriodRepository, tracer: Tracer) {
  return async (userId: UserId, goalId: string): Promise<FreezePeriod[]> => {
    const isOwned = await tracer.span("db.isGoalOwnedByUser", () =>
      repo.isGoalOwnedByUser(goalId, userId),
    );
    if (!isOwned) throw new ResourceNotFoundError("Goal not found");

    const records = await tracer.span("db.getFreezePeriodsByGoalId", () =>
      repo.getFreezePeriodsByGoalId(userId, goalId),
    );
    return records.map(recordToFreezePeriod);
  };
}

function createFreezePeriod(repo: GoalFreezePeriodRepository, tracer: Tracer) {
  return async (
    userId: UserId,
    goalId: string,
    params: CreateFreezePeriodParams,
  ): Promise<FreezePeriod> => {
    const isOwned = await tracer.span("db.isGoalOwnedByUser", () =>
      repo.isGoalOwnedByUser(goalId, userId),
    );
    if (!isOwned) throw new ResourceNotFoundError("Goal not found");

    assertFreezePeriodDateRange(params.startDate, params.endDate);

    const record = await tracer.span("db.createGoalFreezePeriod", () =>
      repo.createGoalFreezePeriod(
        userId,
        goalId,
        params.startDate,
        params.endDate,
      ),
    );
    return recordToFreezePeriod(record);
  };
}

function updateFreezePeriod(repo: GoalFreezePeriodRepository, tracer: Tracer) {
  return async (
    userId: UserId,
    goalId: string,
    id: string,
    params: UpdateFreezePeriodParams,
  ): Promise<FreezePeriod> => {
    const existing = await tracer.span("db.getFreezePeriodByIdAndUserId", () =>
      repo.getFreezePeriodByIdAndUserId(id, userId),
    );
    if (!existing) throw new ResourceNotFoundError("Freeze period not found");

    if (existing.goalId !== goalId) {
      throw new ResourceNotFoundError("Freeze period not found");
    }

    const startDate = params.startDate ?? existing.startDate;
    const endDate =
      params.endDate === undefined ? existing.endDate : params.endDate;
    assertFreezePeriodDateRange(startDate, endDate);

    const record = await tracer.span("db.updateGoalFreezePeriod", () =>
      repo.updateGoalFreezePeriod(id, userId, {
        startDate: params.startDate,
        endDate: params.endDate,
      }),
    );
    return recordToFreezePeriod(record);
  };
}

function deleteFreezePeriod(repo: GoalFreezePeriodRepository, tracer: Tracer) {
  return async (userId: UserId, goalId: string, id: string): Promise<void> => {
    const existing = await tracer.span("db.getFreezePeriodByIdAndUserId", () =>
      repo.getFreezePeriodByIdAndUserId(id, userId),
    );
    if (!existing) throw new ResourceNotFoundError("Freeze period not found");

    if (existing.goalId !== goalId) {
      throw new ResourceNotFoundError("Freeze period not found");
    }

    await tracer.span("db.deleteGoalFreezePeriod", () =>
      repo.deleteGoalFreezePeriod(id, userId),
    );
  };
}

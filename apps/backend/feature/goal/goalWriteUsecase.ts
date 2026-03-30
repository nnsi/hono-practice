import { ResourceNotFoundError } from "@backend/error";
import type { Tracer } from "@backend/lib/tracer";
import { createActivityId } from "@packages/domain/activity/activitySchema";
import { parseDayTargets } from "@packages/domain/goal/dayTargets";
import {
  createActivityGoalEntity,
  createActivityGoalId,
} from "@packages/domain/goal/goalSchema";
import type { UserId } from "@packages/domain/user/userSchema";

import type { ActivityGoalRepository } from "../activitygoal/activityGoalRepository";
import type { CreateGoalRequest, Goal, UpdateGoalRequest } from "./goalTypes";
import { goalEntityToResponse } from "./goalTypes";

export function createGoal(
  activityGoalRepo: ActivityGoalRepository,
  tracer: Tracer,
) {
  return async (userId: UserId, req: CreateGoalRequest): Promise<Goal> => {
    const goal = createActivityGoalEntity({
      type: "new",
      id: createActivityGoalId(),
      userId,
      activityId: createActivityId(req.activityId),
      dailyTargetQuantity: req.dailyTargetQuantity,
      startDate: req.startDate,
      endDate: req.endDate || null,
      isActive: true,
      description: req.description || null,
      debtCap: req.debtCap ?? null,
      dayTargets: parseDayTargets(req.dayTargets),
    });

    const created = await tracer.span("db.createActivityGoal", () =>
      activityGoalRepo.createActivityGoal(goal),
    );

    return goalEntityToResponse(
      created,
      { currentBalance: 0, totalTarget: 0, totalActual: 0 },
      [],
    );
  };
}

export function updateGoal(
  activityGoalRepo: ActivityGoalRepository,
  tracer: Tracer,
) {
  return async (
    userId: UserId,
    goalId: string,
    req: UpdateGoalRequest,
  ): Promise<Goal> => {
    const goal = await tracer.span("db.getActivityGoalByIdAndUserId", () =>
      activityGoalRepo.getActivityGoalByIdAndUserId(
        createActivityGoalId(goalId),
        userId,
      ),
    );
    if (!goal) throw new ResourceNotFoundError("Goal not found");

    const updated = createActivityGoalEntity({
      ...goal,
      dailyTargetQuantity: req.dailyTargetQuantity ?? goal.dailyTargetQuantity,
      startDate: req.startDate ?? goal.startDate,
      endDate: req.endDate === null ? null : (req.endDate ?? goal.endDate),
      description:
        req.description === null ? null : (req.description ?? goal.description),
      isActive: req.isActive ?? goal.isActive,
      debtCap: req.debtCap === null ? null : (req.debtCap ?? goal.debtCap),
      dayTargets:
        req.dayTargets === null
          ? null
          : req.dayTargets
            ? parseDayTargets(req.dayTargets)
            : goal.dayTargets,
    });

    const saved = await tracer.span("db.updateActivityGoal", () =>
      activityGoalRepo.updateActivityGoal(updated),
    );

    return goalEntityToResponse(
      saved,
      { currentBalance: 0, totalTarget: 0, totalActual: 0 },
      [],
    );
  };
}

export function deleteGoal(
  activityGoalRepo: ActivityGoalRepository,
  tracer: Tracer,
) {
  return async (userId: UserId, goalId: string): Promise<void> => {
    const goal = await tracer.span("db.getActivityGoalByIdAndUserId", () =>
      activityGoalRepo.getActivityGoalByIdAndUserId(
        createActivityGoalId(goalId),
        userId,
      ),
    );
    if (!goal) throw new ResourceNotFoundError("Goal not found");

    await tracer.span("db.deleteActivityGoal", () =>
      activityGoalRepo.deleteActivityGoal(goal),
    );
  };
}

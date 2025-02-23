import { DomainValidateError } from "@backend/error";
import dayjs from "@backend/lib/dayjs";
import { z } from "zod";

import { type GoalId, createGoalId, goalIdSchema } from "./goalId";

import type { ActivityId, TaskId, UserId } from "../";

type GoalStatus = "before" | "progress" | "completed" | "expired";

type BaseGoal = {
  id: GoalId;
  userId: UserId;
  parentGoalId: GoalId | null;
  title: string;
  unit: string | null;
  quantity: number | null;
  currentQuantity: number | null;
  emoji: string | null;
  startDate: Date | null;
  dueDate: Date | null;
  status: GoalStatus;
  createdAt?: Date;
  updatedAt?: Date;
};

type ActivityGoal = BaseGoal & {
  activityIds: ActivityId[];
  type: "activity";
};

type MultiTaskGoal = BaseGoal & {
  taskIds: TaskId[];
  type: "multiTask";
};

type CompositeGoal = BaseGoal & {
  activityIds: ActivityId[];
  taskIds: TaskId[];
  type: "composite";
};

type BaseGoalWithType = BaseGoal & {
  type: "single";
};

export type Goal =
  | BaseGoalWithType
  | ActivityGoal
  | MultiTaskGoal
  | CompositeGoal;

function createGoal({
  id,
  userId,
  parentGoalId = null,
  activityIds,
  taskIds,
  title,
  unit = null,
  quantity = null,
  currentQuantity = null,
  emoji = null,
  startDate = null,
  dueDate = null,
  createdAt,
  updatedAt,
}: Partial<Omit<Goal, "parentGoalId" | "activityIds" | "taskIds">> & {
  id?: string | GoalId;
  userId?: UserId;
  parentGoalId?: GoalId | null;
  activityIds?: ActivityId[];
  taskIds?: TaskId[];
}): Goal {
  if (!userId) throw new DomainValidateError("createGoal: userId is required");
  if (!title) throw new DomainValidateError("createGoal: title is required");
  if (startDate && dueDate && startDate > dueDate) {
    throw new DomainValidateError(
      "createGoal: startDate must be before dueDate",
    );
  }

  const goalId = id ?? createGoalId();
  const status = GoalFactory.setStatus(
    startDate,
    dueDate,
    quantity,
    currentQuantity,
  );

  const baseParams = {
    id: goalId,
    userId,
    parentGoalId,
    title,
    unit,
    quantity,
    currentQuantity,
    emoji,
    startDate,
    dueDate,
    status,
    createdAt,
    updatedAt,
  };

  if (activityIds && taskIds) {
    return {
      ...baseParams,
      type: "composite",
      activityIds: activityIds,
      taskIds: taskIds,
    };
  }

  if (activityIds) {
    return {
      ...baseParams,
      type: "activity",
      activityIds: activityIds,
    };
  }

  if (taskIds) {
    return {
      ...baseParams,
      type: "multiTask",
      taskIds: taskIds,
    };
  }

  return {
    ...baseParams,
    type: "single",
  };
}

function updateGoal(
  goal: Goal,
  {
    activityIds,
    taskIds,
    ...params
  }: Partial<
    Omit<Goal, "id" | "userId"> & {
      activityIds?: ActivityId[];
      taskIds?: TaskId[];
    }
  >,
) {
  if (params.title !== undefined) {
    if (!params.title) {
      throw new DomainValidateError("updateGoal: title is required");
    }
  }

  if (params.startDate && params.dueDate && params.startDate > params.dueDate) {
    throw new DomainValidateError(
      "updateGoal: startDate must be before dueDate",
    );
  }

  const baseParams = {
    ...goal,
    ...params,
    updatedAt: new Date(),
  };

  if (activityIds && taskIds) {
    return {
      ...baseParams,
      type: "composite",
      activityIds: activityIds,
      taskIds: taskIds,
    };
  }

  if (activityIds) {
    return {
      ...baseParams,
      type: "activity",
      activityIds: activityIds,
    };
  }

  if (taskIds) {
    return {
      ...baseParams,
      type: "multiTask",
      taskIds: taskIds,
    };
  }

  return baseParams;
}

export const GoalFactory = {
  create: createGoal,
  update: updateGoal,
  setStatus: (
    startDate: Date | null,
    dueDate: Date | null,
    quantity: number | null,
    currentQuantity: number | null,
  ): GoalStatus => {
    if (quantity && currentQuantity && quantity <= currentQuantity)
      return "completed";

    if (startDate && dayjs(startDate) > dayjs()) return "before";

    if (startDate && !dueDate) return "progress";

    if (startDate && dueDate && dueDate < new Date()) return "expired";

    return "progress";
  },
};

export const GoalSchema = z.object({
  id: goalIdSchema,
});

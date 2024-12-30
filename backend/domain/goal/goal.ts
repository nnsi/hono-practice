import { DomainValidateError } from "@/backend/error";

import { type ActivityId, createActivityId } from "../activity";
import { type TaskId, createTaskId } from "../task";
import { type UserId, createUserId } from "../user";

import { type GoalId, createGoalId } from "./goalId";

type GoalStatus = "active" | "completed" | "archived";

export type Goal = {
  id: GoalId;
  userId: UserId;
  parentGoalId: GoalId | null;
  activityIds: ActivityId[];
  taskIds: TaskId[];

  title: string;
  quantityLabel: string | null; // 目標単位
  quantity: number | null; // 目標数値
  emoji: string | null;
  startDate: Date | null;
  dueDate: Date | null;
  status: GoalStatus;
  createdAt?: Date;
  updatedAt?: Date;
};

function createGoal({
  id,
  userId,
  parentGoalId = null,
  activityIds,
  taskIds,
  title,
  quantityLabel = null,
  quantity = null,
  emoji = null,
  startDate = null,
  dueDate = null,
  status = "active",
  createdAt,
  updatedAt,
}: Partial<Omit<Goal, "parentGoalId" | "activityIds" | "taskIds">> & {
  id?: string | GoalId;
  userId?: string | UserId;
  parentGoalId?: string | GoalId | null;
  activityIds: string[];
  taskIds: string[];
}): Goal {
  if (!userId) throw new DomainValidateError("createGoal: userId is required");
  if (!title) throw new DomainValidateError("createGoal: title is required");

  const goalId = id ?? createGoalId();
  const typedUserId = createUserId(userId);
  const typedParentGoalId = parentGoalId ? createGoalId(parentGoalId) : null;
  const typedActivityIds = activityIds?.map(createActivityId) ?? [];
  const typedTaskIds = taskIds?.map(createTaskId) ?? [];

  return {
    id: goalId,
    userId: typedUserId,
    parentGoalId: typedParentGoalId,
    activityIds: typedActivityIds,
    taskIds: typedTaskIds,
    title,
    quantityLabel,
    quantity,
    emoji,
    startDate,
    dueDate,
    status,
    createdAt,
    updatedAt,
  };
}
function updateGoal(
  goal: Goal,
  {
    parentGoalId,
    activityIds,
    taskIds,
    ...params
  }: Partial<
    Omit<Goal, "id" | "userId" | "parentGoalId" | "activityIds" | "taskIds">
  > & {
    parentGoalId?: string | GoalId | null;
    activityIds?: string[];
    taskIds?: string[];
  },
) {
  if (params.title !== undefined) {
    if (!params.title) {
      throw new DomainValidateError("updateGoal: title is required");
    }
  }

  return {
    ...goal,
    parentGoalId: parentGoalId ? createGoalId(parentGoalId) : null,
    activityIds: activityIds?.map(createActivityId) ?? goal.activityIds,
    taskIds: taskIds?.map(createTaskId) ?? goal.taskIds,
    ...params,
    updatedAt: new Date(),
  };
}

export const GoalFactory = {
  create: createGoal,
  update: updateGoal,
};

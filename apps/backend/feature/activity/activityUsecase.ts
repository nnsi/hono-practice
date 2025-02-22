import {
  type Activity,
  type ActivityId,
  ActivitySchema,
  type UserId,
  createActivityId,
} from "@backend/domain";
import { ResourceNotFoundError } from "@backend/error";
import { generateOrder } from "@backend/lib/lexicalOrder";

import type {
  CreateActivityRequest,
  UpdateActivityOrderRequest,
  UpdateActivityRequest,
} from "@dtos/request";

import type { ActivityRepository } from ".";
import type { TransactionRunner } from "@backend/infra/db";

export type ActivityUsecase = {
  getActivities(userId: UserId): Promise<Activity[]>;
  getActivity(userId: UserId, activityId: ActivityId): Promise<Activity>;
  createActivity(userId: UserId, req: CreateActivityRequest): Promise<Activity>;
  updateActivity(
    userId: UserId,
    activityId: ActivityId,
    req: UpdateActivityRequest,
  ): Promise<Activity>;
  updateActivityOrder(
    userId: UserId,
    activityId: ActivityId,
    orderIndexes: UpdateActivityOrderRequest,
  ): Promise<Activity>;
  deleteActivity(userId: UserId, activityId: ActivityId): Promise<void>;
};

export function newActivityUsecase(
  repo: ActivityRepository,
  tx: TransactionRunner,
): ActivityUsecase {
  return {
    getActivities: getActivities(repo),
    getActivity: getActivity(repo),
    createActivity: createActivity(repo, tx),
    updateActivity: updateActivity(repo, tx),
    updateActivityOrder: updateActivityOrder(repo, tx),
    deleteActivity: deleteActivity(repo),
  };
}

function getActivities(repo: ActivityRepository) {
  return async (userId: UserId) => {
    const activity = await repo.getActivitiesByUserId(userId);

    return activity;
  };
}

function getActivity(repo: ActivityRepository) {
  return async (userId: UserId, activityId: ActivityId) => {
    const activity = await repo.getActivityByIdAndUserId(userId, activityId);
    if (!activity) throw new ResourceNotFoundError("activity not found");

    return activity;
  };
}

function createActivity(repo: ActivityRepository, tx: TransactionRunner) {
  return async (userId: UserId, params: CreateActivityRequest) => {
    return tx.run([repo], async (txRepo) => {
      const lastOrderIndex = await txRepo.getLastOrderIndexByUserId(userId);

      const orderIndex = generateOrder(lastOrderIndex ?? "", null);

      const activity = ActivitySchema.parse({
        id: createActivityId(),
        userId: userId,
        name: params.name,
        label: params.label,
        emoji: params.emoji,
        description: params.description,
        quantityUnit: params.quantityUnit,
        orderIndex: orderIndex,
        kinds: [],
        type: "new",
      });

      return await txRepo.createActivity(activity);
    });
  };
}

function updateActivity(repo: ActivityRepository, tx: TransactionRunner) {
  return async (
    userId: UserId,
    activityId: ActivityId,
    params: UpdateActivityRequest,
  ) => {
    return tx.run([repo], async (txRepo) => {
      const activity = await txRepo.getActivityByIdAndUserId(
        userId,
        activityId,
      );
      if (!activity) throw new ResourceNotFoundError("activity not found");

      const kinds = params.kinds.length > 0 ? params.kinds : activity.kinds;

      const newActivity = ActivitySchema.parse({
        ...activity,
        ...params.activity,
        kinds,
      });

      return await txRepo.updateActivity(newActivity);
    });
  };
}

function updateActivityOrder(repo: ActivityRepository, tx: TransactionRunner) {
  return async (
    userId: UserId,
    activityId: ActivityId,
    params: UpdateActivityOrderRequest,
  ) => {
    const typedPrevId = params.prev ? createActivityId(params.prev) : undefined;
    const typedNextId = params.next ? createActivityId(params.next) : undefined;

    const ids = [activityId, typedPrevId, typedNextId].filter(
      Boolean,
    ) as ActivityId[];

    return tx.run([repo], async (txRepo) => {
      const activities = await txRepo.getActivitiesByIdsAndUserId(userId, ids);

      const activity = activities.find((a) => a.id === activityId);
      if (!activity) throw new ResourceNotFoundError("activity not found");

      const prevActivity = activities.find((a) => a.id === typedPrevId);
      const nextActivity = activities.find((a) => a.id === typedNextId);

      const orderIndex = generateOrder(
        prevActivity?.orderIndex,
        nextActivity?.orderIndex,
      );

      activity.orderIndex = orderIndex;

      return await txRepo.updateActivity(activity);
    });
  };
}

function deleteActivity(repo: ActivityRepository) {
  return async (userId: UserId, activityId: ActivityId) => {
    const activity = await repo.getActivityByIdAndUserId(userId, activityId);
    if (!activity) throw new ResourceNotFoundError("activity not found");

    return await repo.deleteActivity(activity);
  };
}

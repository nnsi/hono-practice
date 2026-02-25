import {
  type Activity,
  type ActivityId,
  createActivityEntity,
  createActivityId,
  createActivityKindId,
} from "@packages/domain/activity/activitySchema";
import type { UserId } from "@packages/domain/user/userSchema";
import { ResourceNotFoundError } from "@backend/error";
import type { TransactionRunner } from "@backend/infra/rdb/db";
import { generateOrder } from "@backend/lib/lexicalOrder";
import type { Tracer } from "@backend/lib/tracer";
import type {
  CreateActivityRequest,
  UpdateActivityOrderRequest,
  UpdateActivityRequest,
} from "@dtos/request";

import type { ActivityRepository } from ".";

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
  tracer: Tracer,
): ActivityUsecase {
  return {
    getActivities: getActivities(repo, tracer),
    getActivity: getActivity(repo, tracer),
    createActivity: createActivity(repo, tx, tracer),
    updateActivity: updateActivity(repo, tx, tracer),
    updateActivityOrder: updateActivityOrder(repo, tx, tracer),
    deleteActivity: deleteActivity(repo, tracer),
  };
}

function getActivities(repo: ActivityRepository, tracer: Tracer) {
  return async (userId: UserId) => {
    const activity = await tracer.span("db.getActivitiesByUserId", () =>
      repo.getActivitiesByUserId(userId),
    );

    return activity;
  };
}

function getActivity(repo: ActivityRepository, tracer: Tracer) {
  return async (userId: UserId, activityId: ActivityId) => {
    const activity = await tracer.span("db.getActivityByIdAndUserId", () =>
      repo.getActivityByIdAndUserId(userId, activityId),
    );
    if (!activity) throw new ResourceNotFoundError("activity not found");

    return activity;
  };
}

function createActivity(
  repo: ActivityRepository,
  tx: TransactionRunner,
  tracer: Tracer,
) {
  return async (userId: UserId, params: CreateActivityRequest) => {
    return tx.run([repo], async (txRepo) => {
      const lastOrderIndex = await tracer.span(
        "db.getLastOrderIndexByUserId",
        () => txRepo.getLastOrderIndexByUserId(userId),
      );

      const orderIndex = generateOrder(lastOrderIndex ?? "", null);

      const kinds = (params.kinds ?? []).map((k) => ({
        id: createActivityKindId(),
        name: k.name,
        orderIndex: null,
        color: k.color,
      }));

      const activity = createActivityEntity({
        id: createActivityId(),
        userId: userId,
        name: params.name,
        label: params.label,
        emoji: params.emoji,
        iconType: params.iconType || "emoji",
        iconUrl: null,
        iconThumbnailUrl: null,
        description: params.description,
        quantityUnit: params.quantityUnit,
        orderIndex: orderIndex,
        showCombinedStats: params.showCombinedStats ?? true,
        kinds,
        type: "new",
      });

      return await tracer.span("db.createActivity", () =>
        txRepo.createActivity(activity),
      );
    });
  };
}

function updateActivity(
  repo: ActivityRepository,
  tx: TransactionRunner,
  tracer: Tracer,
) {
  return async (
    userId: UserId,
    activityId: ActivityId,
    params: UpdateActivityRequest,
  ) => {
    return tx.run([repo], async (txRepo) => {
      const activity = await tracer.span("db.getActivityByIdAndUserId", () =>
        txRepo.getActivityByIdAndUserId(userId, activityId),
      );
      if (!activity) throw new ResourceNotFoundError("activity not found");

      const inputKinds = params.kinds.map((k) => {
        return {
          id: k.id ?? createActivityKindId(),
          name: k.name,
          color: k.color,
        };
      });

      const kinds = inputKinds.length > 0 ? inputKinds : activity.kinds;

      const newActivity = createActivityEntity({
        ...activity,
        ...params.activity,
        showCombinedStats:
          params.activity.showCombinedStats ?? activity.showCombinedStats,
        kinds,
      });

      return await tracer.span("db.updateActivity", () =>
        txRepo.updateActivity(newActivity),
      );
    });
  };
}

function updateActivityOrder(
  repo: ActivityRepository,
  tx: TransactionRunner,
  tracer: Tracer,
) {
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
      const activities = await tracer.span(
        "db.getActivitiesByIdsAndUserId",
        () => txRepo.getActivitiesByIdsAndUserId(userId, ids),
      );

      const activity = activities.find((a) => a.id === activityId);
      if (!activity) throw new ResourceNotFoundError("activity not found");

      const prevActivity = activities.find((a) => a.id === typedPrevId);
      const nextActivity = activities.find((a) => a.id === typedNextId);

      const orderIndex = generateOrder(
        prevActivity?.orderIndex,
        nextActivity?.orderIndex,
      );

      activity.orderIndex = orderIndex;

      return await tracer.span("db.updateActivity", () =>
        txRepo.updateActivity(activity),
      );
    });
  };
}

function deleteActivity(repo: ActivityRepository, tracer: Tracer) {
  return async (userId: UserId, activityId: ActivityId) => {
    const activity = await tracer.span("db.getActivityByIdAndUserId", () =>
      repo.getActivityByIdAndUserId(userId, activityId),
    );
    if (!activity) throw new ResourceNotFoundError("activity not found");

    return await tracer.span("db.deleteActivity", () =>
      repo.deleteActivity(activity),
    );
  };
}

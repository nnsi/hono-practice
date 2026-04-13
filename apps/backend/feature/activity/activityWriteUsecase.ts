import { ResourceNotFoundError } from "@backend/error";
import type { TransactionRunner } from "@backend/infra/rdb/db";
import type { Tracer } from "@backend/lib/tracer";
import {
  type ActivityId,
  createActivityEntity,
  createActivityId,
  createActivityKindId,
} from "@packages/domain/activity/activitySchema";
import type { UserId } from "@packages/domain/user/userSchema";
import type {
  CreateActivityRequest,
  UpdateActivityOrderRequest,
  UpdateActivityRequest,
} from "@packages/types/request";
import { generateOrder } from "@packages/utils/lexicalOrder";

import type { ActivityRepository } from "./activityRepository";

export function createActivity(
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
      const kinds = (params.kinds ?? []).map((kind) => ({
        id: createActivityKindId(),
        name: kind.name,
        orderIndex: null,
        color: kind.color,
      }));

      const activity = createActivityEntity({
        id: createActivityId(),
        userId,
        name: params.name,
        label: params.label,
        emoji: params.emoji,
        iconType: params.iconType || "emoji",
        iconUrl: null,
        iconThumbnailUrl: null,
        description: params.description,
        quantityUnit: params.quantityUnit,
        orderIndex,
        showCombinedStats: params.showCombinedStats ?? true,
        recordingMode: params.recordingMode ?? "manual",
        recordingModeConfig: params.recordingModeConfig,
        kinds,
        type: "new",
      });

      return tracer.span("db.createActivity", () =>
        txRepo.createActivity(activity),
      );
    });
  };
}

export function updateActivity(
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
      if (!activity) {
        throw new ResourceNotFoundError("activity not found");
      }

      const kinds = params.kinds.map((kind) => ({
        id: kind.id ?? createActivityKindId(),
        name: kind.name,
        color: kind.color,
      }));

      const updatedActivity = createActivityEntity({
        ...activity,
        ...params.activity,
        showCombinedStats:
          params.activity.showCombinedStats ?? activity.showCombinedStats,
        kinds,
      });

      return tracer.span("db.updateActivity", () =>
        txRepo.updateActivity(updatedActivity),
      );
    });
  };
}

export function updateActivityOrder(
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
      (id): id is ActivityId => Boolean(id),
    );

    return tx.run([repo], async (txRepo) => {
      const activities = await tracer.span(
        "db.getActivitiesByIdsAndUserId",
        () => txRepo.getActivitiesByIdsAndUserId(userId, ids),
      );

      const activity = activities.find((item) => item.id === activityId);
      if (!activity) {
        throw new ResourceNotFoundError("activity not found");
      }

      const prevActivity = activities.find((item) => item.id === typedPrevId);
      const nextActivity = activities.find((item) => item.id === typedNextId);
      activity.orderIndex = generateOrder(
        prevActivity?.orderIndex,
        nextActivity?.orderIndex,
      );

      return tracer.span("db.updateActivity", () =>
        txRepo.updateActivity(activity),
      );
    });
  };
}

export function deleteActivity(repo: ActivityRepository, tracer: Tracer) {
  return async (userId: UserId, activityId: ActivityId) => {
    const activity = await tracer.span("db.getActivityByIdAndUserId", () =>
      repo.getActivityByIdAndUserId(userId, activityId),
    );
    if (!activity) {
      throw new ResourceNotFoundError("activity not found");
    }

    return tracer.span("db.deleteActivity", () =>
      repo.deleteActivity(activity),
    );
  };
}

import { ResourceNotFoundError } from "@backend/error";
import type { Tracer } from "@backend/lib/tracer";
import type { ActivityId } from "@packages/domain/activity/activitySchema";
import type { UserId } from "@packages/domain/user/userSchema";

import type { ActivityRepository } from "./activityRepository";

export function getActivities(repo: ActivityRepository, tracer: Tracer) {
  return async (userId: UserId) => {
    return tracer.span("db.getActivitiesByUserId", () =>
      repo.getActivitiesByUserId(userId),
    );
  };
}

export function getActivity(repo: ActivityRepository, tracer: Tracer) {
  return async (userId: UserId, activityId: ActivityId) => {
    const activity = await tracer.span("db.getActivityByIdAndUserId", () =>
      repo.getActivityByIdAndUserId(userId, activityId),
    );
    if (!activity) {
      throw new ResourceNotFoundError("activity not found");
    }

    return activity;
  };
}

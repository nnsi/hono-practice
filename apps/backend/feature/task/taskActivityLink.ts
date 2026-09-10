import { AppError } from "@backend/error";
import type { Tracer } from "@backend/lib/tracer";
import {
  createActivityId,
  createActivityKindId,
} from "@packages/domain/activity/activitySchema";
import type { UserId } from "@packages/domain/user/userSchema";

import type { ActivityRepository } from "../activity/activityRepository";
export async function assertTaskActivityLink(
  activityRepo: ActivityRepository,
  tracer: Tracer,
  userId: UserId,
  activityId: string | null | undefined,
  activityKindId: string | null | undefined,
) {
  if (activityKindId != null && activityId == null) {
    throw new AppError("activityKindId requires activityId", 400);
  }
  if (activityId == null) return;

  const ownedActivityId = createActivityId(activityId);
  const activity = await tracer.span("db.getActivityByIdAndUserId", () =>
    activityRepo.getActivityByIdAndUserId(userId, ownedActivityId),
  );
  if (!activity) {
    throw new AppError("activityId does not belong to user", 400);
  }
  if (activityKindId == null) return;

  const ownedActivityKindId = createActivityKindId(activityKindId);
  const hasKind = activity.kinds.some(
    (kind) => kind.id === ownedActivityKindId,
  );
  if (!hasKind) {
    throw new AppError("activityKindId does not belong to activity", 400);
  }
}

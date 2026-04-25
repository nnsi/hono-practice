import { ResourceNotFoundError } from "@backend/error";
import type { Tracer } from "@backend/lib/tracer";
import { createActivityKindId } from "@packages/domain/activity/activitySchema";
import {
  type ActivityLog,
  type ActivityLogId,
  createActivityLogEntity,
} from "@packages/domain/activityLog/activityLogSchema";
import type { UserId } from "@packages/domain/user/userSchema";

import type { ActivityRepository } from "../activity";
import type { ActivityLogRepository } from "./activityLogRepository";

type UpdateActivityLogParams = {
  quantity?: number;
  memo?: string;
  activityKindId?: string | null;
};

export function updateActivityLog(
  repo: ActivityLogRepository,
  acRepo: ActivityRepository,
  tracer: Tracer,
) {
  return async (
    userId: UserId,
    activityLogId: ActivityLogId,
    params: UpdateActivityLogParams,
  ) => {
    const activityLog = await tracer.span(
      "db.getActivityLogByIdAndUserId",
      () => repo.getActivityLogByIdAndUserId(userId, activityLogId),
    );
    if (!activityLog) {
      throw new ResourceNotFoundError("activity log not found");
    }

    let activityKind = activityLog.activityKind ?? null;

    if (params.activityKindId !== undefined) {
      if (params.activityKindId === null) {
        activityKind = null;
      } else {
        const activityKindId = createActivityKindId(params.activityKindId);
        const activityKindParent = await tracer.span(
          "db.getActivityByUserIdAndActivityKindId",
          () =>
            acRepo.getActivityByUserIdAndActivityKindId(userId, activityKindId),
        );
        if (!activityKindParent) {
          throw new ResourceNotFoundError("activity kind not found");
        }
        if (activityKindParent.id !== activityLog.activity.id) {
          throw new ResourceNotFoundError("activity kind not found");
        }

        activityKind =
          activityKindParent.kinds.find((ak) => ak?.id === activityKindId) ??
          null;
        if (activityKind === null) {
          throw new ResourceNotFoundError("activity kind not found");
        }
      }
    }

    const newActivityLog = createActivityLogEntity({
      ...activityLog,
      ...params,
      activityKind,
    });

    return tracer.span("db.updateActivityLog", () =>
      repo.updateActivityLog(newActivityLog),
    );
  };
}

export function deleteActivityLog(repo: ActivityLogRepository, tracer: Tracer) {
  return async (
    userId: UserId,
    activityLogId: ActivityLogId,
  ): Promise<void> => {
    const activityLog = await tracer.span(
      "db.getActivityLogByIdAndUserId",
      () => repo.getActivityLogByIdAndUserId(userId, activityLogId),
    );
    if (!activityLog) {
      throw new ResourceNotFoundError("activity log not found");
    }
    await tracer.span("db.deleteActivityLog", () =>
      repo.deleteActivityLog(activityLog),
    );
  };
}

export function getActivityLog(repo: ActivityLogRepository, tracer: Tracer) {
  return async (
    userId: UserId,
    activityLogId: ActivityLogId,
  ): Promise<ActivityLog> => {
    const aLog = await tracer.span("db.getActivityLogByIdAndUserId", () =>
      repo.getActivityLogByIdAndUserId(userId, activityLogId),
    );
    if (!aLog) {
      throw new ResourceNotFoundError("activity log not found");
    }
    return aLog;
  };
}

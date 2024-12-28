import { Activity, ActivityKind } from "../activity";
import { createUserId, UserId } from "../user";

import { createActivityLogId, ActivityLogId } from "./activityLogId";

type BaseActivityLog = {
  id: ActivityLogId;
  userId: UserId;
  activity: Activity;
  activityKind: ActivityKind | null;
  quantity: number | null;
  memo?: string | null;
  date: string; // YYYY-MM-DD
};

type PersistedActivityLog = BaseActivityLog & {
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type ActivityLog = BaseActivityLog | PersistedActivityLog;

function createActivityLog(params: {
  id?: string | ActivityLogId;
  userId: string | UserId;
  activity: Activity;
  activityKind: ActivityKind | null;
  quantity: number | null;
  memo?: string;
  date: string | Date;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}): ActivityLog {
  const id = createActivityLogId(params.id);
  const userId = createUserId(params.userId);

  return {
    ...params,
    date:
      typeof params.date === "string"
        ? params.date
        : new Date(params.date).toISOString().split("T")[0],
    id,
    userId,
  };
}

function updateActivityLog(
  log: ActivityLog,
  params: Partial<
    Omit<BaseActivityLog, "id" | "userId" | "activityId" | "date"> & {
      date: string | Date;
    }
  >
): ActivityLog {
  const date = params.date
    ? typeof params.date === "string"
      ? params.date
      : new Date(params.date).toISOString().split("T")[0]
    : log.date;

  return {
    ...log,
    ...params,
    date,
  };
}

export const ActivityLog = {
  create: createActivityLog,
  update: updateActivityLog,
};

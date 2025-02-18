import {
  createActivityKindId,
  type Activity,
  type ActivityKind,
} from "../activity";
import { type UserId, createUserId } from "../user";

import { type ActivityLogId, createActivityLogId } from "./activityLogId";

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
      activityKindId: string | null;
    }
  >,
): ActivityLog {
  const date = params.date
    ? typeof params.date === "string"
      ? params.date
      : new Date(params.date).toISOString().split("T")[0]
    : log.date;

  const activityKind = params.activityKindId
    ? { id: createActivityKindId(params.activityKindId), name: "" }
    : params.activityKindId != null
      ? null
      : log.activityKind;

  return {
    ...log,
    ...params,
    activityKind,
    date,
  };
}

export const ActivityLogFactory = {
  create: createActivityLog,
  update: updateActivityLog,
};

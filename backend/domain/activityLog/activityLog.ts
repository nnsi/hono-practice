import { Activity, ActivityKind } from "../activity";
import { createUserId, UserId } from "../user";

import { createActivityLogId, ActivityLogId } from "./activityLogId";

type BaseActivityLog = {
  id: ActivityLogId;
  userId: UserId; // Activityが論理削除されてもどのユーザーに属するか判別可能
  activity: Activity;
  activityKind: ActivityKind;
  quantity: number | null;
  memo?: string;
  date: Date;
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
  activityKind: ActivityKind;
  quantity: number | null;
  memo?: string;
  date: Date;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}): ActivityLog {
  const id = createActivityLogId(params.id);
  const userId = createUserId(params.userId);

  return {
    ...params,
    id,
    userId,
  };
}

function updateActivityLog(
  log: ActivityLog,
  params: Partial<Omit<BaseActivityLog, "id" | "userId" | "activityId">>
): ActivityLog {
  return {
    ...log,
    ...params,
    updatedAt: new Date(),
  };
}

export const ActivityLog = {
  create: createActivityLog,
  update: updateActivityLog,
};

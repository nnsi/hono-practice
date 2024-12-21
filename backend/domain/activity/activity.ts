import { createUserId, UserId } from "../user";

import { createActivityId, ActivityId, ActivityKindId } from ".";

export type ActivityKind = {
  id: ActivityKindId;
  name: string;
  orderIndex?: string;
};

type BaseActivity = {
  id: ActivityId;
  userId: UserId;
  name: string;
  label: string;
  emoji: string;
  description?: string | null;
  quantityLabel: string;
  orderIndex: string;
  activityKind?: ActivityKind;
};

type PersistedActivity = BaseActivity & {
  createdAt: Date;
  updatedAt: Date;
};

export type Activity = BaseActivity | PersistedActivity;

function createActivity(params: {
  id?: string | ActivityId;
  userId: string | UserId;
  name: string;
  label: string;
  emoji: string;
  description?: string;
  quantityLabel: string;
  orderIndex: string;
  createdAt?: Date;
  updatedAt?: Date;
}): Activity {
  const id = createActivityId(params.id);
  const userId = createUserId(params.userId);

  return {
    ...params,
    id,
    userId,
  };
}

function updateActivity(
  activity: Activity,
  params: Partial<Omit<BaseActivity, "id" | "userId">>
): Activity {
  return {
    ...activity,
    ...params,
    updatedAt: new Date(),
  };
}

export const Activity = {
  create: createActivity,
  update: updateActivity,
};

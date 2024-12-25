import { createUserId, UserId } from "../user";

import {
  createActivityId,
  ActivityId,
  ActivityKindId,
  createActivityKindId,
} from ".";

export type ActivityKind = {
  id: ActivityKindId;
  name: string;
  orderIndex?: string | null;
};

type BaseActivity = {
  id: ActivityId;
  userId: UserId;
  name: string;
  label?: string | null;
  emoji?: string | null;
  description?: string | null;
  quantityLabel: string | null;
  options: [];
  orderIndex: string | null;
  kinds?: ActivityKind[];
};

type PersistedActivity = BaseActivity & {
  createdAt: Date;
  updatedAt: Date;
};

export type Activity = BaseActivity | PersistedActivity;

function createActivity(
  params: {
    id?: string | ActivityId;
    userId: string | UserId;
    name: string;
    label?: string | null;
    emoji?: string | null;
    description?: string | null;
    quantityLabel: string | null;
    orderIndex: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  },
  kinds?: {
    id: string | ActivityKindId;
    name: string;
    orderIndex?: string | null;
  }[]
): Activity {
  const id = createActivityId(params.id);
  const userId = createUserId(params.userId);

  return {
    ...params,
    options: [],
    id,
    userId,
    kinds: kinds
      ? kinds.map((kind) => ({ ...kind, id: createActivityKindId(kind.id) }))
      : [],
  };
}

function updateActivity(
  activity: Activity,
  params: {
    activity: Partial<Omit<BaseActivity, "id" | "userId">>;
    kinds?: { id?: string; name: string }[];
  }
): Activity {
  return {
    ...activity,
    ...params.activity,
    kinds: params.kinds
      ? params.kinds.map((kind) => ({
          ...kind,
          id: createActivityKindId(kind.id),
        }))
      : activity.kinds,
    updatedAt: new Date(),
  };
}

export const Activity = {
  create: createActivity,
  update: updateActivity,
};

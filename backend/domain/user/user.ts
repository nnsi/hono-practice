import { createUserId, UserId } from "./userId";

type BaseUser = {
  id: UserId;
  name?: string | null;
  loginId: string;
  password: string;
};

type PersistedUser = BaseUser & {
  createdAt: Date;
  updatedAt: Date;
};

export type User = BaseUser | PersistedUser;

function createUser(params: {
  id?: string | UserId;
  loginId: string;
  name?: string | null;
  password: string;
}): User {
  const id = createUserId(params.id);

  return {
    ...params,
    id,
  };
}

export const User = {
  create: createUser,
};

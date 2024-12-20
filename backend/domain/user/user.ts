import { createUserId, UserId } from "./userId";

export type User = {
  id: UserId;
  loginId: string;
  password: string;
  name?: string | null;
};

function createUser(
  id: string | UserId,
  loginId: string,
  password: string,
  name?: string | null
): User {
  return {
    id: createUserId(id),
    loginId,
    password,
    name,
  };
}

export const User = {
  create: createUser,
};

import { validate } from "uuid";

export type UserId = string & { readonly __brand: unique symbol };

export type User = {
  id: UserId;
  loginId: string;
  password: string;
  name?: string | null;
};

export function createUserId(id?: string): UserId {
  if(id && !validate(id)) {
    throw new Error('Invalid id');
  }
  return id as UserId;
}

function createUser(id: string | UserId, loginId: string, password: string, name?: string | null): User {
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
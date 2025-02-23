import { sign } from "hono/jwt";

import {
  createUserEntity,
  createUserId,
  type User,
  type UserId,
} from "@backend/domain";
import { AppError } from "@backend/error";
import bcrypt from "bcryptjs";

import type { UserRepository } from "./userRepository";

export type CreateUserInputParams = {
  loginId: string;
  password: string;
  name?: string;
};

export type UserUsecase = {
  createUser: (
    params: CreateUserInputParams,
    secret: string,
  ) => Promise<string>;
  getUserById: (userId: UserId) => Promise<User>;
};

export function newUserUsecase(repo: UserRepository): UserUsecase {
  return {
    createUser: createUser(repo),
    getUserById: getUserById(repo),
  };
}

function createUser(repo: UserRepository) {
  return async (params: CreateUserInputParams, secret: string) => {
    const cryptedPassword = bcrypt.hashSync(params.password, 12);
    params.password = cryptedPassword;
    const newUser = createUserEntity({
      type: "new",
      id: createUserId(),
      ...params,
    });

    const user = await repo.createUser(newUser);

    const token = await sign(
      { id: user.id, exp: Math.floor(Date.now() / 1000) + 365 * 60 * 60 },
      secret,
    );

    return token;
  };
}

function getUserById(repo: UserRepository) {
  return async (userId: UserId) => {
    const user = await repo.getUserById(userId);
    if (!user) throw new AppError("user not found", 404);

    return user;
  };
}

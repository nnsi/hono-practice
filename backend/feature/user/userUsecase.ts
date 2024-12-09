import { sign } from "hono/jwt";

import bcrypt from "bcrypt";

import { User } from "@/backend/domain/model/user";
import { AppError } from "@/backend/error";

import { config } from "../../config";

import { UserCreateParams, UserRepository } from ".";

export type UserUsecase = {
  createUser: (params: UserCreateParams) => Promise<string>;
  getUserById: (userId: string) => Promise<User>;
  getUserByLoginId: (loginId: string) => Promise<User>;
};

export function newUserUsecase(repo: UserRepository): UserUsecase {
  return {
    createUser: createUser(repo),
    getUserById: getUserById(repo),
    getUserByLoginId: getUserByLoginId(repo),
  };
}

function createUser(repo: UserRepository) {
  return async function (params: UserCreateParams) {
    const cryptedPassword = bcrypt.hashSync(params.password, 10);
    params.password = cryptedPassword;

    const user = await repo.createUser(params);

    const token = await sign(
      { id: user.id, exp: Math.floor(Date.now() / 1000) + 365 * 60 * 60 },
      config.JWT_SECRET
    );

    return token;
  };
}

function getUserById(repo: UserRepository) {
  return async function (userId: string) {
    const user = await repo.getUserById(userId);
    if (!user) throw new AppError("user not found", 404);

    return user;
  };
}

function getUserByLoginId(repo: UserRepository) {
  return async function (loginId: string) {
    const user = await repo.getUserByLoginId(loginId);
    if (!user) throw new AppError("user not found", 404);

    return user;
  };
}

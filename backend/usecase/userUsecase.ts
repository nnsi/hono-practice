import { sign } from "hono/jwt";

import bcrypt from "bcrypt";

import { CreateUserRequest } from "@/types/request";

import { config } from "../config";
import { UserRepository } from "../repository";

export type UserUsecase = {
  createUser: (params: CreateUserRequest) => Promise<string>;
  getUserById: (userId: string) => Promise<{ id: string; name: string | null }>;
};

export function newUserUsecase(repo: UserRepository): UserUsecase {
  return {
    createUser: createUser(repo),
    getUserById: getUserById(repo),
  };
}

function createUser(repo: UserRepository) {
  return async function (params: CreateUserRequest) {
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
    return await repo.getUserById(userId);
  };
}

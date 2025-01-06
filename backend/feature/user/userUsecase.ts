import { sign } from "hono/jwt";

import bcrypt from "bcrypt";

import { type User, UserFactory, type UserId } from "@/backend/domain";
import { AppError } from "@/backend/error";

import { config } from "../../config";

import type { UserRepository } from "./userRepository";

export type CreateUserInputParams = {
  loginId: string;
  password: string;
  name?: string;
};

export type UserUsecase = {
  createUser: (params: CreateUserInputParams) => Promise<string>;
  getUserById: (userId: UserId) => Promise<User>;
};

export function newUserUsecase(repo: UserRepository): UserUsecase {
  return {
    createUser: createUser(repo),
    getUserById: getUserById(repo),
  };
}

function createUser(repo: UserRepository) {
  return async (params: CreateUserInputParams) => {
    const cryptedPassword = bcrypt.hashSync(params.password, 12);
    params.password = cryptedPassword;
    const newUser = UserFactory.create({ ...params });

    const user = await repo.createUser(newUser);

    const token = await sign(
      { id: user.id, exp: Math.floor(Date.now() / 1000) + 365 * 60 * 60 },
      config.JWT_SECRET,
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

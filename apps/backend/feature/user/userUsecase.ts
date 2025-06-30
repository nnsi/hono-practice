import { sign } from "hono/jwt";

import {
  type User,
  type UserId,
  createUserEntity,
  createUserId,
} from "@backend/domain";
import { AppError } from "@backend/error";

import { MultiHashPasswordVerifier } from "../auth/passwordVerifier";

import type { UserRepository } from "./userRepository";
import type { UserProviderRepository } from "../auth/userProviderRepository";

export type CreateUserInputParams = {
  loginId: string;
  password: string;
  name?: string;
};

export type UserWithProviders = User & { providers: string[] };

export type UserUsecase = {
  createUser: (
    params: CreateUserInputParams,
    secret: string,
  ) => Promise<string>;
  getUserById: (userId: UserId) => Promise<UserWithProviders>;
};

export function newUserUsecase(
  repo: UserRepository,
  userProviderRepo: UserProviderRepository,
): UserUsecase {
  const passwordVerifier = new MultiHashPasswordVerifier();

  return {
    createUser: createUser(repo, passwordVerifier),
    getUserById: getUserById(repo, userProviderRepo),
  };
}

function createUser(
  repo: UserRepository,
  passwordVerifier: MultiHashPasswordVerifier,
) {
  return async (params: CreateUserInputParams, secret: string) => {
    const cryptedPassword = await passwordVerifier.hash(params.password);
    const newUser = createUserEntity({
      type: "new",
      id: createUserId(),
      name: params.name,
      loginId: params.loginId,
      password: cryptedPassword,
    });

    const user = await repo.createUser(newUser);

    const token = await sign(
      { id: user.id, exp: Math.floor(Date.now() / 1000) + 365 * 60 * 60 },
      secret,
    );

    return token;
  };
}

function getUserById(
  repo: UserRepository,
  userProviderRepo: UserProviderRepository,
) {
  return async (userId: UserId): Promise<UserWithProviders> => {
    const user = await repo.getUserById(userId);
    if (!user) throw new AppError("user not found", 404);
    const providers = (
      await userProviderRepo.getUserProvidersByUserId(userId)
    ).map((p) => p.provider);
    return { ...user, providers };
  };
}

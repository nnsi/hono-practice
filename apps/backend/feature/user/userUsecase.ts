import { sign } from "hono/jwt";

import {
  type User,
  type UserId,
  createUserEntity,
  createUserId,
} from "@packages/domain/user/userSchema";
import { AppError, ConflictError } from "@backend/error";
import type { Tracer } from "@backend/lib/tracer";

import { MultiHashPasswordVerifier } from "../auth/passwordVerifier";
import type { UserProviderRepository } from "../auth/userProviderRepository";
import type { UserRepository } from "./userRepository";

export type CreateUserInputParams = {
  loginId: string;
  password: string;
  name?: string;
};

export type UserWithProviders = User & {
  providers: string[];
  providerEmails?: Record<string, string>;
};

export type UserUsecase = {
  createUser: (
    params: CreateUserInputParams,
    secret: string,
  ) => Promise<string>;
  getUserById: (userId: UserId) => Promise<UserWithProviders>;
  deleteUser: (userId: UserId) => Promise<void>;
};

export function newUserUsecase(
  repo: UserRepository,
  userProviderRepo: UserProviderRepository,
  tracer: Tracer,
): UserUsecase {
  const passwordVerifier = new MultiHashPasswordVerifier();

  return {
    createUser: createUser(repo, passwordVerifier, tracer),
    getUserById: getUserById(repo, userProviderRepo, tracer),
    deleteUser: deleteUser(repo, tracer),
  };
}

function createUser(
  repo: UserRepository,
  passwordVerifier: MultiHashPasswordVerifier,
  tracer: Tracer,
) {
  return async (params: CreateUserInputParams, secret: string) => {
    // ログインIDの重複チェック
    const existingUser = await tracer.span("db.getUserByLoginId", () =>
      repo.getUserByLoginId(params.loginId),
    );
    if (existingUser) {
      throw new ConflictError("このログインIDは既に使用されています");
    }

    const cryptedPassword = await passwordVerifier.hash(params.password);
    const newUser = createUserEntity({
      type: "new",
      id: createUserId(),
      name: params.name,
      loginId: params.loginId,
      password: cryptedPassword,
    });

    const user = await tracer.span("db.createUser", () =>
      repo.createUser(newUser),
    );

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
  tracer: Tracer,
) {
  return async (userId: UserId): Promise<UserWithProviders> => {
    const [user, userProviders] = await Promise.all([
      tracer.span("db.getUserById", () => repo.getUserById(userId)),
      tracer.span("db.getUserProvidersByUserId", () =>
        userProviderRepo.getUserProvidersByUserId(userId),
      ),
    ]);
    if (!user) throw new AppError("user not found", 404);
    const providers = userProviders.map((p) => p.provider);

    // providerEmailsオブジェクトを作成
    const providerEmails: Record<string, string> = {};
    for (const userProvider of userProviders) {
      if (userProvider.email) {
        providerEmails[userProvider.provider] = userProvider.email;
      }
    }

    return {
      ...user,
      providers,
      providerEmails:
        Object.keys(providerEmails).length > 0 ? providerEmails : undefined,
    };
  };
}

function deleteUser(repo: UserRepository, tracer: Tracer) {
  return async (userId: UserId): Promise<void> => {
    await tracer.span("db.deleteUser", () => repo.deleteUser(userId));
  };
}

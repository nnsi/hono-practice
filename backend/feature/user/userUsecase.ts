import { sign } from "hono/jwt";

import bcrypt from "bcrypt";

import { createUserId, Task, User } from "@/backend/domain";
import { AppError } from "@/backend/error";
import { AppGateway } from "@/backend/infra/drizzle";
import { ActivityStats } from "@/backend/query/activityQueryService";

import { config } from "../../config";

import { UserRepository } from "./userRepository";

export type CreateUserInputParams = {
  loginId: string;
  password: string;
  name?: string;
};

export type UserUsecase = {
  createUser: (params: CreateUserInputParams) => Promise<string>;
  getUserById: (userId: string) => Promise<User>;
  getDashboardById: (
    userId: string,
    startDate: Date,
    endDate: Date
  ) => Promise<{ user: User; tasks: Task[]; activityStats: ActivityStats[] }>;
};

export function newUserUsecase(gw: AppGateway): UserUsecase {
  return {
    createUser: createUser(gw),
    getUserById: getUserById(gw),
    getDashboardById: getDashboardById(gw),
  };
}

function createUser(repo: UserRepository) {
  return async function (params: CreateUserInputParams) {
    const cryptedPassword = bcrypt.hashSync(params.password, 10);
    params.password = cryptedPassword;
    const newUser = User.create({ ...params });

    const user = await repo.createUser(newUser);

    const token = await sign(
      { id: user.id, exp: Math.floor(Date.now() / 1000) + 365 * 60 * 60 },
      config.JWT_SECRET
    );

    return token;
  };
}

function getUserById(repo: UserRepository) {
  return async function (userId: string) {
    const id = createUserId(userId);

    const user = await repo.getUserById(id);
    if (!user) throw new AppError("user not found", 404);

    return user;
  };
}

function getDashboardById(gw: AppGateway) {
  return async function (userId: string, startDate: Date, endDate: Date) {
    return await gw.runInTx(async (tx) => {
      const id = createUserId(userId);

      const user = await tx.getUserById(id);
      if (!user) throw new AppError("user not found", 404);

      const tasks = await tx.getDoneTasksByUserId(userId);

      const activityStats = await tx.activityStatsQuery(
        userId,
        startDate,
        endDate
      );

      return { user, tasks, activityStats };
    });
  };
}

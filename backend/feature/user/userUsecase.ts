import { sign } from "hono/jwt";

import bcrypt from "bcrypt";

import { createUserId, Task, User } from "@/backend/domain";
import { AppError } from "@/backend/error";
import { AppGateway } from "@/backend/infra/drizzle";
import { ActivityStats } from "@/backend/query/activityQueryService";

import { config } from "../../config";

export type CreateUserInputParams = {
  loginId: string;
  password: string;
  name?: string;
};

export type UserUsecase = {
  createUser: (params: CreateUserInputParams) => Promise<string>;
  getUserById: (userId: string) => Promise<User>;
  getUserByLoginId: (loginId: string) => Promise<User | undefined>;
  getDashboardById: (
    userId: string,
    startDate: Date,
    endDate: Date
  ) => Promise<{ user: User; tasks: Task[]; activityStats: ActivityStats[] }>;
};

export function newUserUsecase(gateway: AppGateway): UserUsecase {
  return {
    createUser: createUser(gateway),
    getUserById: getUserById(gateway),
    getUserByLoginId: getUserByLoginId(gateway),
    getDashboardById: getDashboardById(gateway),
  };
}

function createUser(gateway: AppGateway) {
  return async function (params: CreateUserInputParams) {
    const cryptedPassword = bcrypt.hashSync(params.password, 10);
    params.password = cryptedPassword;
    const newUser = User.create({ ...params });

    const user = await gateway.createUser(newUser);

    const token = await sign(
      { id: user.id, exp: Math.floor(Date.now() / 1000) + 365 * 60 * 60 },
      config.JWT_SECRET
    );

    return token;
  };
}

function getUserById(gateway: AppGateway) {
  return async function (userId: string) {
    const id = createUserId(userId);

    const user = await gateway.getUserById(id);
    if (!user) throw new AppError("user not found", 404);

    return user;
  };
}

function getUserByLoginId(gateway: AppGateway) {
  return async function (loginId: string) {
    return await gateway.getUserByLoginId(loginId);
  };
}

function getDashboardById(gateway: AppGateway) {
  return async function (userId: string, startDate: Date, endDate: Date) {
    return await gateway.runInTx(async (gateway) => {
      const id = createUserId(userId);

      const user = await gateway.getUserById(id);
      if (!user) throw new AppError("user not found", 404);

      const tasks = await gateway.getDoneTasksByUserId(userId);

      const activityStats = await gateway.activityStatsQuery(
        userId,
        startDate,
        endDate
      );

      return { user, tasks, activityStats };
    });
  };
}

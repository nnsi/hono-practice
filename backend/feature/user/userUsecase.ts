import { sign } from "hono/jwt";

import bcrypt from "bcrypt";

import { Task, User } from "@/backend/domain";
import { AppError } from "@/backend/error";
import { TransactionPort } from "@/backend/infra/transactionPort";
import {
  ActivityQueryService,
  ActivityStats,
} from "@/backend/query/activityStats";

import { config } from "../../config";
import { TaskRepository } from "../task";

import { UserCreateParams, UserRepository } from ".";

export type UserUsecase = {
  createUser: (params: UserCreateParams) => Promise<string>;
  getUserById: (userId: string) => Promise<User>;
  getUserByLoginId: (loginId: string) => Promise<User | undefined>;
  getDashboardById: (
    userId: string,
    startDate: Date,
    endDate: Date
  ) => Promise<{ user: User; tasks: Task[]; activityStats: ActivityStats[] }>;
};

export function newUserUsecase(
  repo: UserRepository,
  taskRepo: TaskRepository,
  activityQuery: ActivityQueryService,
  tx: TransactionPort
): UserUsecase {
  return {
    createUser: createUser(repo),
    getUserById: getUserById(repo),
    getUserByLoginId: getUserByLoginId(repo),
    getDashboardById: getDashboardById(repo, taskRepo, activityQuery, tx),
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
    return await repo.getUserByLoginId(loginId);
  };
}

function getDashboardById(
  repo: UserRepository,
  taskRepo: TaskRepository,
  activityQuery: ActivityQueryService,
  tx: TransactionPort
) {
  return async function (userId: string, startDate: Date, endDate: Date) {
    return await tx.transaction(async () => {
      const user = await repo.getUserById(userId);
      if (!user) throw new AppError("user not found", 404);

      const tasks = await taskRepo.getDoneTasksByUserId(userId);

      const activityStats = await activityQuery.activityStatsQuery(
        userId,
        startDate,
        endDate
      );

      return { user, tasks, activityStats };
    });
  };
}

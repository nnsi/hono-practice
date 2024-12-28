import { sign } from "hono/jwt";

import bcrypt from "bcrypt";

import { createUserId, Task, User } from "@/backend/domain";
import { AppError } from "@/backend/error";
import { TransactionRunner } from "@/backend/infra/db";
import { ActivityQueryService } from "@/backend/query";
import { GetActivityStatsResponse } from "@/types/response";

import { config } from "../../config";
import { TaskRepository } from "../task";

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
  ) => Promise<{
    user: User;
    tasks: Task[];
    activityStats: GetActivityStatsResponse;
  }>;
};

export function newUserUsecase(
  tx: TransactionRunner,
  repo: UserRepository,
  TaskRepo: TaskRepository,
  ActivityQS: ActivityQueryService
): UserUsecase {
  return {
    createUser: createUser(repo),
    getUserById: getUserById(repo),
    getDashboardById: getDashboardById(repo, TaskRepo, ActivityQS, tx),
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

function getDashboardById(
  repo: UserRepository,
  taskRepo: TaskRepository,
  activityQS: ActivityQueryService,
  tx: TransactionRunner
) {
  return async function (userId: string, startDate: Date, endDate: Date) {
    const id = createUserId(userId);

    return await tx.run([repo, taskRepo, activityQS], async (txRepos) => {
      try {
        await txRepos.getUserById(id);
      } catch (e) {
        console.log(e);
        throw new AppError("user not found", 404);
      }
      const user = await txRepos.getUserById(id);
      if (!user) throw new AppError("user not found", 404);

      const tasks = await txRepos.getDoneTasksByUserId(userId);

      const activityStats = await txRepos.activityStatsQuery(
        userId,
        startDate,
        endDate
      );

      return { user, tasks, activityStats };
    });
  };
}

import { sign } from "hono/jwt";

import bcrypt from "bcrypt";

import { createUserId, Task, User } from "@/backend/domain";
import { AppError } from "@/backend/error";
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
    endDate: Date,
    userRepo: UserRepository,
    taskRepo: TaskRepository,
    activityQS: ActivityQueryService
  ) => Promise<{
    user: User;
    tasks: Task[];
    activityStats: GetActivityStatsResponse[];
  }>;
};

export function newUserUsecase(repo: UserRepository): UserUsecase {
  return {
    createUser: createUser(repo),
    getUserById: getUserById(repo),
    getDashboardById: getDashboardById(),
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

function getDashboardById() {
  return async function (
    userId: string,
    startDate: Date,
    endDate: Date,
    userRepo: UserRepository,
    taskRepo: TaskRepository,
    activityQS: ActivityQueryService
  ) {
    const id = createUserId(userId);

    const user = await userRepo.getUserById(id);
    if (!user) throw new AppError("user not found", 404);

    const tasks = await taskRepo.getDoneTasksByUserId(userId);

    const activityStats = await activityQS.activityStatsQuery(
      userId,
      startDate,
      endDate
    );

    return { user, tasks, activityStats };
  };
}

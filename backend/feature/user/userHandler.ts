import { setCookie } from "hono/cookie";

import { CreateUserRequest } from "@/types/request";
import {
  GetTasksResponseSchema,
  GetUserResponseSchema,
} from "@/types/response/";

import { HonoContext } from "../../context";
import { AppError } from "../../error";

import { UserCreateSchema, UserUsecase } from ".";

export function newUserHandler(uc: UserUsecase) {
  return {
    createUser: createUser(uc),
    getMe: getMe(uc),
    getDashboard: getDashboard(uc),
  };
}

function createUser(uc: UserUsecase) {
  return async (c: HonoContext) => {
    const json = await c.req.json<CreateUserRequest>();

    const parsedJson = UserCreateSchema.safeParse(json);
    if (!parsedJson.success) {
      throw new AppError("failed to parse request", 400);
    }

    const token = await uc.createUser(json);

    setCookie(c, "auth", token, {
      httpOnly: true,
    });

    return c.body(null, 204);
  };
}

function getMe(uc: UserUsecase) {
  return async (c: HonoContext) => {
    const userId = c.get("jwtPayload").id;
    const user = await uc.getUserById(userId);

    const parsedUser = GetUserResponseSchema.safeParse(user);
    if (!parsedUser.success) {
      throw new AppError("failed to parse user", 500);
    }

    return c.json(parsedUser.data, 200);
  };
}

function getDashboard(uc: UserUsecase) {
  return async (c: HonoContext) => {
    const userId = c.get("jwtPayload").id;
    const { user, tasks } = await uc.getDashboardById(userId);

    const parsedUser = GetUserResponseSchema.safeParse(user);
    if (!parsedUser.success) {
      throw new AppError("failed to parse user", 500);
    }

    const responseTasks = tasks.map((task) => ({
      ...task,
      id: task.id.value,
      userId: task.userId.value,
    }));

    const parsedTasks = GetTasksResponseSchema.safeParse(responseTasks);
    if (!parsedTasks.success) {
      throw new AppError("failed to parse tasks", 500);
    }

    return c.json({ user: parsedUser.data, tasks: parsedTasks.data }, 200);
  };
}

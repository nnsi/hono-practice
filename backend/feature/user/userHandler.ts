import { setCookie } from "hono/cookie";

import dayjs from "dayjs";

import { CreateUserRequest } from "@/types/request";
import {
  GetActivityStatsResponse,
  GetTasksResponseSchema,
  GetUserResponseSchema,
} from "@/types/response/";

import { HonoContext } from "../../context";
import { AppError } from "../../error";

import { UserUsecase } from ".";

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

    const startDate = new Date(
      c.req.query("startDate") ?? dayjs().startOf("month").toDate()
    );
    const endDate = new Date(
      c.req.query("endDate") ?? dayjs().endOf("month").toDate()
    );

    const { user, tasks, activityStats } = await uc.getDashboardById(
      userId,
      startDate,
      endDate
    );

    const parsedUser = GetUserResponseSchema.safeParse(user);
    if (!parsedUser.success) {
      throw new AppError("failed to parse user", 500);
    }

    const responseTasks = tasks.map((task) => ({
      ...task,
      id: task.id,
      userId: task.userId,
    }));

    const parsedTasks = GetTasksResponseSchema.safeParse(responseTasks);
    if (!parsedTasks.success) {
      throw new AppError("failed to parse tasks", 500);
    }

    const stats: GetActivityStatsResponse[] = activityStats.reduce(
      (acc, row) => {
        const activity = acc.find((a) => a.id === row.activity_id);
        if (!activity) {
          acc.push({
            id: row.activity_id,
            name: row.activity_name,
            total: row.total_quantity ?? 0,
            kinds: [
              {
                id: row.activity_kind_id,
                name: row.kind_name ?? "",
                total: row.total_quantity ?? 0,
                logs: [row.logs as any], // FIXME: any
              },
            ],
          });
          return acc;
        }
        activity.total += row.total_quantity ?? activity.total;
        activity.kinds.push({
          id: row.activity_kind_id,
          name: row.kind_name ?? "",
          total: row.total_quantity ?? 0,
          logs: [row.logs as any], // FIXME: any
        });

        return acc;
      },
      [] as GetActivityStatsResponse[]
    );

    return c.json(
      { user: parsedUser.data, tasks: parsedTasks.data, activityStats: stats },
      200
    );
  };
}

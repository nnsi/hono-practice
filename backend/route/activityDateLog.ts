import { Hono } from "hono";
import { createFactory } from "hono/factory";

import dayjs from "@/backend/lib/dayjs";
import { prisma } from "@/backend/lib/prisma";
import {
  GetActivityLogResponse,
  GetActivityLogsResponse,
  GetActivityLogsResponseSchema,
} from "@/types/response";

import { JwtEnv } from "../middleware/authMiddleware";

const factory = createFactory<JwtEnv>();
const app = new Hono();

const getHandler = factory.createHandlers(async (c) => {
  const { date, month } = c.req.param();

  const dateQuery =
    date || !month
      ? {
          equals: dayjs(date).toDate(),
        }
      : {
          gte: dayjs(month).startOf("month").toDate(),
          lt: dayjs(month).endOf("month").toDate(),
        };

  const activityLogs: GetActivityLogsResponse =
    await prisma.activityLog.findMany({
      select: {
        id: true,
        quantity: true,
        memo: true,
        date: true,
        createdAt: true,
        updatedAt: true,
        activity: {
          select: {
            id: true,
            name: true,
            quantityLabel: true,
          },
        },
        activityKind: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      where: {
        date: dateQuery,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

  const parsedActivityLogs =
    GetActivityLogsResponseSchema.safeParse(activityLogs);
  if (!parsedActivityLogs.success) {
    console.log(JSON.stringify(parsedActivityLogs.error));
    return c.json({ error: "Failed to fetch activity logs" }, 500);
  }

  return c.json(parsedActivityLogs.data, 200);
});

const findHandler = factory.createHandlers(async (c) => {
  const { id } = c.req.param();

  const activityLog: GetActivityLogResponse | null =
    await prisma.activityLog.findUnique({
      select: {
        id: true,
        quantity: true,
        memo: true,
        date: true,
        createdAt: true,
        updatedAt: true,
        activity: {
          select: {
            id: true,
            name: true,
            quantityLabel: true,
          },
        },
        activityKind: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      where: {
        id,
        activity: {
          userId: c.get("jwtPayload").id,
        },
      },
    });

  if (!activityLog) {
    return c.json({ message: "Activity log not found" }, 404);
  }

  return c.json(activityLog, 200);
});

export const activityDateLogRoute = app
  .get("/", ...getHandler)
  .get("/single/:id", ...findHandler)
  .get("/daily/:date", ...getHandler)
  .get("/monthly/:month", ...getHandler);

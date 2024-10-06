import { Hono } from "hono";
import { createFactory } from "hono/factory";

import { activityStats } from "@prisma/client/sql";

import dayjs from "@/backend/lib/dayjs";
import { defaultPrisma, prisma } from "@/backend/lib/prisma";
import {
  GetActivityLogResponse,
  GetActivityLogsResponse,
  GetActivityLogsResponseSchema,
} from "@/types/response";
import { GetActivityStatsResponse } from "@/types/response/GetActivityStatsResponse";

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

const statsHandler = factory.createHandlers(async (c) => {
  const { month } = c.req.param();

  const result = await defaultPrisma.$queryRawTyped(
    activityStats(
      c.get("jwtPayload").id,
      dayjs(month).startOf("month").toDate(),
      dayjs(month).endOf("month").toDate()
    )
  );

  const stats: GetActivityStatsResponse[] = result.reduce((acc, row) => {
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
  }, [] as GetActivityStatsResponse[]);

  return c.json(stats, 200);
});

export const activityDateLogRoute = app
  .get("/", ...getHandler)
  .get("/single/:id", ...findHandler)
  .get("/daily/:date", ...getHandler)
  .get("/monthly/:month", ...getHandler)
  .get("/stats/:month", ...statsHandler);

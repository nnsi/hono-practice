import { Hono } from "hono";
import { createFactory } from "hono/factory";
import { JwtEnv } from "../middleware/authMiddleware";
import { prisma } from "@/backend/lib/prisma";
import dayjs from "@/backend/lib/dayjs";
import { GetActivityLogsResponseSchema } from "@/types/response";

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

  const activityLogs = await prisma.activityLog.findMany({
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
    },
    where: {
      date: dateQuery,
    },
    orderBy: {
      createdAt: "desc",
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

export const activityDateLogRoute = app
  .get("/", ...getHandler)
  .get("/daily/:date", ...getHandler)
  .get("/monthly/:month", ...getHandler);
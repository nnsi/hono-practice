import { Hono } from "hono";
import { createFactory } from "hono/factory";
import { JwtEnv } from "../middleware/authMiddleware";
import { prisma } from "@/backend/lib/prisma";
import dayjs from "@/backend/lib/dayjs";

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

  const activitiyLogs = await prisma.activityLog.findMany({
    select: {
      id: true,
      quantity: true,
      memo: true,
      date: true,
      createdAt: true,
      updatedAt: true,
      activity: {
        select: {
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

  return c.json(activitiyLogs, 200);
});

export const activityDateLogRoute = app
  .get("/", ...getHandler)
  .get("/daily/:date", ...getHandler)
  .get("/monthly/:month", ...getHandler);

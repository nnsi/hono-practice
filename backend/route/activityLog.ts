import { Hono } from "hono";
import { createFactory } from "hono/factory";

import { zValidator } from "@hono/zod-validator";

import { prisma } from "@/backend/lib/prisma";
import {
  CreateActivityLogRequest,
  CreateActivityLogRequestSchema,
} from "@/types/request/CreateActivityLogRequest";
import {
  UpdateActivityLogRequest,
  UpdateActivityLogRequestSchema,
} from "@/types/request/UpdateActivityLogRequest";

import { JwtEnv } from "../middleware/authMiddleware";

const factory = createFactory<JwtEnv>();
const app = new Hono();

async function checkActivityLogOwner({
  activityId: id,
  userId,
}: {
  activityId: string;
  userId: string;
}) {
  const activity = await prisma.activity.findFirst({
    select: {
      userId: true,
    },
    where: {
      userId,
      id,
    },
  });

  if (activity?.userId !== userId) {
    return false;
  }
  return true;
}

const getHandler = factory.createHandlers(async (c) => {
  const { id: activityId } = c.req.param();

  checkActivityLogOwner({
    activityId,
    userId: c.get("jwtPayload").id,
  });

  const activitiyLogs = await prisma.activityLog.findMany({
    select: {
      id: true,
      quantity: true,
      memo: true,
      date: true,
      createdAt: true,
      updatedAt: true,
    },
    where: {
      activityId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return c.json(activitiyLogs, 200);
});

const createHandler = factory.createHandlers(
  zValidator("json", CreateActivityLogRequestSchema),
  async (c) => {
    const { id: activityId } = c.req.param();

    checkActivityLogOwner({
      activityId,
      userId: c.get("jwtPayload").id,
    });

    const request = await c.req.json<CreateActivityLogRequest>();
    const parsedrequest = CreateActivityLogRequestSchema.safeParse(request);
    if (!parsedrequest.success) {
      return c.json({ message: "failed to parse json" }, 500);
    }

    const activityLog = await prisma.activityLog.create({
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
      data: {
        ...parsedrequest.data,
        date: new Date(parsedrequest.data.date),
        activityId,
      },
    });

    return c.json(activityLog, 200);
  }
);

const updateHandler = factory.createHandlers(
  zValidator("json", UpdateActivityLogRequestSchema),
  async (c) => {
    const { id: activityId, logId } = c.req.param();

    checkActivityLogOwner({
      activityId,
      userId: c.get("jwtPayload").id,
    });

    const json = await c.req.json<UpdateActivityLogRequest>();

    const parsedJson = UpdateActivityLogRequestSchema.safeParse(json);
    if (!parsedJson.success) {
      return c.json({ message: "failed to parse json" }, 500);
    }

    const activityLog = await prisma.activityLog.update({
      where: {
        id: logId,
        activityId: activityId,
      },
      data: {
        ...parsedJson.data,
      },
    });

    return c.json(activityLog, 200);
  }
);

const deleteHandler = factory.createHandlers(async (c) => {
  const { id: activityId, logId } = c.req.param();

  checkActivityLogOwner({
    activityId,
    userId: c.get("jwtPayload").id,
  });

  await prisma.activityLog.delete({
    where: {
      id: logId,
      activityId,
    },
  });

  return c.json({ message: "success" }, 200);
});

export const activityLogRoute = app
  .get("/", ...getHandler)
  .post("/", ...createHandler)
  .put("/:logId", ...updateHandler)
  .delete("/:logId", ...deleteHandler);

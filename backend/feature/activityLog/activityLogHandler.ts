import { Hono } from "hono";
import { createFactory } from "hono/factory";

import { zValidator } from "@hono/zod-validator";

import { prisma } from "@/backend/lib/prisma";
import { ActivitySelectSchema } from "@/types/prisma";
import {
  CreateActivityLogRequest,
  CreateActivityLogRequestSchema,
} from "@/types/request/CreateActivityLogRequest";
import {
  UpdateActivityLogRequest,
  UpdateActivityLogRequestSchema,
} from "@/types/request/UpdateActivityLogRequest";
import {
  GetActivityLogResponse,
  GetActivityLogResponseSchema,
  GetActivityLogsResponse,
  GetActivityLogsResponseSchema,
} from "@/types/response";

import { zodSchemaToSelector } from "../../lib/zodSchemaToSelector";

const factory = createFactory();
const app = new Hono();

const select = zodSchemaToSelector(
  GetActivityLogResponseSchema,
  ActivitySelectSchema
);

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

  const activitiyLogs: GetActivityLogsResponse =
    await prisma.activityLog.findMany({
      select: select,
      where: {
        activityId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

  const parsedJson = GetActivityLogsResponseSchema.safeParse(activitiyLogs);
  if (!parsedJson.success) {
    return c.json({ message: "failed to parse json" }, 500);
  }

  return c.json(parsedJson.data, 200);
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

    const activityLog: GetActivityLogResponse = await prisma.activityLog.create(
      {
        select: select,
        data: {
          ...request,
          date: new Date(request.date),
          activityId,
        },
      }
    );

    const parsedJson = GetActivityLogResponseSchema.safeParse(activityLog);
    if (!parsedJson.success) {
      console.log(JSON.stringify(parsedJson.error));
      return c.json({ message: "failed to parse json" }, 500);
    }

    return c.json(parsedJson.data, 200);
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
      select,
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

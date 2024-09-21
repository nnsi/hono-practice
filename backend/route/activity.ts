import { Hono } from "hono";
import { createFactory } from "hono/factory";

import { zValidator } from "@hono/zod-validator";

import { prisma } from "@/backend/lib/prisma";
import {
  CreateActivityRequest,
  CreateActivityRequestSchema,
} from "@/types/request/CreateActivityRequest";
import {
  UpdateActivityOrderRequest,
  UpdateActivityOrderRequestSchema,
  UpdateActivityRequest,
  UpdateActivityRequestSchema,
} from "@/types/request/UpdateActivityRequest";
import {
  GetActivitiesResponseSchema,
  GetActivityResponse,
  GetActivityResponseSchema,
} from "@/types/response/GetActivitiesResponse";

import { generateNextOrder, generateOrder } from "../lib/lexicalOrder";
import { JwtEnv } from "../middleware/authMiddleware";

import { activityLogRoute } from "./activityLog";

const factory = createFactory<JwtEnv>();
const app = new Hono();

const getHandler = factory.createHandlers(async (c) => {
  const userId = c.get("jwtPayload").id;
  const activities = await prisma.activity.findMany({
    select: {
      id: true,
      name: true,
      quantityLabel: true,
      description: true,
      options: true,
      kinds: true,
    },
    where: {
      userId,
    },
    orderBy: {
      orderIndex: "asc",
    },
  });

  const parsedActivities = GetActivitiesResponseSchema.safeParse(activities);
  if (!parsedActivities.success) {
    return c.json({ message: "エラーが発生しました" }, 500);
  }

  return c.json(parsedActivities.data, 200);
});

const createHandler = factory.createHandlers(
  zValidator("json", CreateActivityRequestSchema),
  async (c) => {
    const userId = c.get("jwtPayload").id;
    const { quantityOption, ...json } =
      await c.req.json<CreateActivityRequest>();

    const lastOrderActivity = await prisma.activity.findFirst({
      select: {
        orderIndex: true,
      },
      where: {
        userId,
      },
      orderBy: {
        orderIndex: "desc",
      },
    });

    const orderIndex = generateNextOrder(lastOrderActivity?.orderIndex ?? "");

    const activity = await prisma.activity.create({
      data: {
        ...json,
        userId,
        orderIndex,
      },
    });

    const responseJson: GetActivityResponse = {
      ...activity,
      options: [] as unknown as { id: string; quantity: number }[],
      kinds: [] as unknown as { id: string; name: string }[],
    };

    if (quantityOption) {
      await prisma.activityQuantityOption.createMany({
        data: quantityOption.map((q) => ({
          quantity: q,
          activityId: activity.id,
        })),
      });

      const options = await prisma.activityQuantityOption.findMany({
        select: {
          id: true,
          quantity: true,
        },
        where: {
          activityId: activity.id,
        },
      });

      responseJson.options.push(...options);
    }
    const parsedJson = GetActivityResponseSchema.safeParse(responseJson);
    if (!parsedJson.success) {
      console.log(parsedJson.error);
      return c.json({ message: "エラーが発生しました" }, 500);
    }

    return c.json(parsedJson.data, 200);
  }
);

const updateHandler = factory.createHandlers(
  zValidator("json", UpdateActivityRequestSchema),
  async (c) => {
    const userId = c.get("jwtPayload").id;
    const { id: activityId } = c.req.param();
    const { activity, options, kinds } =
      await c.req.json<UpdateActivityRequest>();

    const { updateOptions, insertOptions } = options.reduce(
      (acc, option) => {
        if (option.id) {
          acc.updateOptions.push({ id: option.id, quantity: option.quantity });
        } else {
          acc.insertOptions.push(option);
        }
        return acc;
      },
      {
        updateOptions: [] as { id: string; quantity: number }[],
        insertOptions: [] as { quantity: number }[],
      }
    );

    const { updateKinds, insertKinds } = kinds.reduce(
      (acc, kind) => {
        if (kind.id) {
          acc.updateKinds.push({ id: kind.id, name: kind.name });
        } else {
          acc.insertKinds.push(kind);
        }
        return acc;
      },
      {
        updateKinds: [] as { id: string; name: string }[],
        insertKinds: [] as { name: string }[],
      }
    );

    // TODO : prisma.$transaction
    await Promise.all([
      ...updateOptions.map((option) =>
        prisma.activityQuantityOption.update({
          where: {
            id: option.id,
          },
          data: {
            quantity: option.quantity,
          },
        })
      ),
      ...updateKinds.map((kind) =>
        prisma.activityKind.update({
          where: {
            id: kind.id,
          },
          data: {
            name: kind.name,
          },
        })
      ),
      insertOptions.length > 0 &&
        prisma.activityQuantityOption.createMany({
          data: insertOptions.map((option) => ({
            quantity: option.quantity,
            activityId: activityId,
          })),
        }),
      insertKinds.length > 0 &&
        prisma.activityKind.createMany({
          data: insertKinds.map((kind) => ({
            name: kind.name,
            activityId: activityId,
          })),
        }),
    ]);

    const updatedActivity: GetActivityResponse = await prisma.activity.update({
      select: {
        id: true,
        name: true,
        quantityLabel: true,
        description: true,
        options: true,
        kinds: true,
      },
      where: {
        id: activityId,
        userId: userId,
      },
      data: {
        ...activity,
      },
    });

    const parsedJson = GetActivityResponseSchema.safeParse(updatedActivity);
    if (!parsedJson.success) {
      return c.json({ message: "エラーが発生しました" }, 500);
    }

    return c.json(parsedJson.data, 200);
  }
);

const deleteHandler = factory.createHandlers(async (c) => {
  const { id } = c.req.param();
  const userId = c.get("jwtPayload").id;

  await prisma.activity.delete({
    where: {
      id,
      userId,
    },
  });

  return c.json({ message: "success" }, 200);
});

const updateOrderHandler = factory.createHandlers(
  zValidator("json", UpdateActivityOrderRequestSchema),
  async (c) => {
    const { id } = c.req.param();
    const userId = c.get("jwtPayload").id;
    const { prev, next } = await c.req.json<UpdateActivityOrderRequest>();

    const ids = [prev, next].filter((id) => id !== undefined);

    if (ids.length === 0) {
      return c.json({ message: "エラーが発生しました" }, 500);
    }

    const activities = await prisma.activity.findMany({
      select: {
        id: true,
        orderIndex: true,
      },
      where: {
        id: {
          in: ids,
        },
      },
      orderBy: {
        orderIndex: "asc",
      },
    });

    if (activities.length === 0) {
      return c.json({ message: "エラーが発生しました" }, 500);
    }

    const prevActivity = activities.find((a) => a.id === prev);
    const nextActivity = activities.find((a) => a.id === next);

    const orderIndex = generateOrder(
      prevActivity?.orderIndex,
      nextActivity?.orderIndex
    );

    await prisma.activity.update({
      where: {
        id,
        userId,
      },
      data: {
        orderIndex,
      },
    });

    return c.json({ message: "success" }, 200);
  }
);

export const activityRoute = app
  .get("/", ...getHandler)
  .post("/", ...createHandler)
  .put("/:id", ...updateHandler)
  .put("/:id/order", ...updateOrderHandler)
  .delete("/:id", ...deleteHandler)
  .route("/:id/logs", activityLogRoute);

import { Hono } from "hono";
import { createFactory } from "hono/factory";

import { zValidator } from "@hono/zod-validator";
import { Prisma } from "@prisma/client";

import { HonoContext } from "@/backend/context";
import { AppError } from "@/backend/error";
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
  GetActivitiesResponse,
  GetActivitiesResponseSchema,
  GetActivityResponse,
  GetActivityResponseSchema,
} from "@/types/response/GetActivitiesResponse";

import { generateOrder } from "../../lib/lexicalOrder";
import { activityLogRoute } from "../activityLog";

import { ActivityUsecase } from ".";

const factory = createFactory();
const app = new Hono();

const SELECT_ACTIVITY_FIELDS: Prisma.ActivitySelect = {
  id: true,
  name: true,
  quantityLabel: true,
  description: true,
  options: true,
  emoji: true,
  kinds: {
    select: {
      id: true,
      name: true,
    },
    where: {
      deletedAt: null,
    },
    orderBy: {
      orderIndex: "asc",
    },
  },
};

const getHandler = factory.createHandlers(async (c) => {
  const userId = c.get("jwtPayload").id;
  const activities: GetActivitiesResponse = await prisma.activity.findMany({
    select: SELECT_ACTIVITY_FIELDS,
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

    const orderIndex = generateOrder(lastOrderActivity?.orderIndex ?? "", null);

    const activity = await prisma.activity.create({
      select: SELECT_ACTIVITY_FIELDS,
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

    const currentKinds = await prisma.activityKind.findMany({
      select: {
        id: true,
        name: true,
      },
      where: {
        activityId,
      },
    });

    const deleteKinds = currentKinds
      .filter((kind) => !kinds.some((k) => k.id === kind.id))
      .map((kind) => kind.id);

    const response = await prisma.$transaction(async () => {
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

      const updatedActivity: GetActivityResponse = await prisma.activity.update(
        {
          select: SELECT_ACTIVITY_FIELDS,
          where: {
            id: activityId,
            userId: userId,
          },
          data: {
            ...activity,
          },
        }
      );

      await prisma.activityKind.deleteMany({
        where: {
          id: {
            in: deleteKinds,
          },
        },
      });
      return updatedActivity;
    });

    const parsedJson = GetActivityResponseSchema.safeParse(response);
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
        name: true,
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

/* --- */

export function newActivityHandler(uc: ActivityUsecase) {
  return {
    getActivities: getActivities(uc),
    getActivity: getActivity(uc),
    createActivity: createActivity(uc),
    updateActivity: updateActivity(uc),
    deleteActivity: deleteActivity(uc),
    //    updateActivityOrder: updateActivityOrder(uc),
  };
}

function getActivities(uc: ActivityUsecase) {
  return async (c: HonoContext) => {
    const activities = await uc.getActivities(c.get("userId"));
    const parsedActivities = GetActivitiesResponseSchema.safeParse(activities);
    if (!parsedActivities.success) {
      throw new AppError("failed to parse activities", 500);
    }
    return c.json(parsedActivities.data);
  };
}

function getActivity(uc: ActivityUsecase) {
  return async (c: HonoContext, id: string) => {
    const activity = await uc.getActivity(c.get("userId"), id);

    const parsedActivity = GetActivityResponseSchema.safeParse(activity);
    if (!parsedActivity.success) {
      throw new AppError("failed to parse activity", 500);
    }

    return c.json(parsedActivity.data);
  };
}

function createActivity(uc: ActivityUsecase) {
  return async (c: HonoContext, json: CreateActivityRequest) => {
    const activity = await uc.createActivity(c.get("userId"), json);

    const parsedActivity = GetActivityResponseSchema.safeParse(activity);
    if (!parsedActivity.success) {
      throw new AppError("failed to parse activity", 500);
    }

    return c.json(parsedActivity.data);
  };
}

function updateActivity(uc: ActivityUsecase) {
  return async (c: HonoContext, id: string, json: UpdateActivityRequest) => {
    const activity = await uc.updateActivity(c.get("userId"), id, json);

    const parsedActivity = GetActivityResponseSchema.safeParse(activity);
    if (!parsedActivity.success) {
      throw new AppError("failed to parse activity", 500);
    }
    return c.json(parsedActivity.data);
  };
}

function deleteActivity(uc: ActivityUsecase) {
  return async (c: HonoContext, id: string) => {
    await uc.deleteActivity(c.get("userId"), id);

    return c.json({ message: "success" });
  };
}

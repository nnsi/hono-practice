import { Hono } from "hono";
import { createFactory } from "hono/factory";
import { zValidator } from "@hono/zod-validator";
import { JwtEnv } from "../middleware/authMiddleware";
import { prisma } from "@/backend/lib/prisma";
import { activityLogRoute } from "./activityLog";
import {
  CreateActivityRequest,
  CreateActivityRequestSchema,
} from "@/types/request/CreateActivityRequest";
import { GetActivitiesResponseSchema } from "@/types/response/GetActivitiesResponse";

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
    },
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
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
    const { name, description, quantityOption } =
      await c.req.json<CreateActivityRequest>();

    const activity = await prisma.activity.create({
      data: {
        name,
        description,
        userId,
      },
    });

    const activityWithOptions = {
      ...activity,
      quantityOptions: [] as unknown as { id: string; quantity: number }[],
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

      activityWithOptions.quantityOptions.push(...options);
    }

    return c.json(activityWithOptions, 200);
  }
);

const updateHandler = factory.createHandlers(async (c) => {
  c.json({ message: "Hello" }, 200);
});

const deleteHandler = factory.createHandlers(async (c) => {
  c.json({ message: "Hello" }, 200);
});

export const activityRoute = app
  .get("/", ...getHandler)
  .post("/", ...createHandler)
  .put("/:id", ...updateHandler)
  .delete("/:id", ...deleteHandler)
  .route("/:id/logs", activityLogRoute);

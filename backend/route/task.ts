import { Hono } from "hono";
import { createFactory } from "hono/factory";
import { PrismaClient } from "@prisma/client";
import {
  CreateTaskRequest,
  createTaskRequestSchema,
} from "@/types/request/CreateTaskRequest";
import {
  UpdateTaskRequest,
  updateTaskRequestSchema,
} from "@/types/request/UpdateTaskRequest";
import { JwtEnv } from "../middleware/authMiddleware";
import { zValidator } from "@hono/zod-validator";
import { GetTasksResponseSchema } from "@/types/response/GetTasksResponse";

const factory = createFactory<
  JwtEnv & { Variables: { prisma: PrismaClient } }
>();
const app = new Hono();

const getHandler = factory.createHandlers(async (c) => {
  const prisma = c.get("prisma");
  const tasks = await prisma.task.findMany({
    select: {
      id: true,
      title: true,
      done: true,
      createdAt: true,
      updatedAt: true,
    },
    where: {
      userId: c.get("jwtPayload").id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const convertTasks = tasks.map((task) => ({
    ...task,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  }));

  const parsedTasks = GetTasksResponseSchema.safeParse(convertTasks);
  console.log(parsedTasks);

  return c.json(parsedTasks.data, 200);
});

const findHandler = factory.createHandlers(async (c) => {
  const { id } = c.req.param();
  const prisma = c.get("prisma");

  const task = await prisma.task.findFirst({
    select: {
      id: true,
      title: true,
      done: true,
      memo: true,
      createdAt: true,
      updatedAt: true,
    },
    where: {
      id,
      userId: c.get("jwtPayload").id,
    },
  });

  if (!task) {
    return c.json({ message: "task not found" }, 404);
  }

  return c.json(task, 200);
});

const createHandler = factory.createHandlers(
  zValidator("json", createTaskRequestSchema),
  async (c) => {
    const prisma = c.get("prisma");
    const json = await c.req.json<CreateTaskRequest>();

    const task = await prisma.task.create({
      data: {
        title: json.title,
        userId: c.get("jwtPayload").id,
      },
    });

    if (!task) {
      return c.json({ message: "failed to create task" }, 500);
    }

    return c.json(task, 200);
  }
);

const updateHandler = factory.createHandlers(
  zValidator("json", updateTaskRequestSchema),
  async (c) => {
    const id = c.req.param("id");
    const prisma = c.get("prisma");
    const json = await c.req.json<UpdateTaskRequest>();

    const task = await prisma.task.update({
      where: {
        id,
        userId: c.get("jwtPayload").id,
      },
      data: {
        ...json,
      },
    });

    if (!task) {
      return c.json({ message: "task not found" }, 404);
    }

    return c.json(task, 200);
  }
);

const deleteHandler = factory.createHandlers(async (c) => {
  const id = c.req.param("id");
  const prisma = c.get("prisma");

  await prisma.task.delete({
    where: {
      id,
      userId: c.get("jwtPayload").id,
    },
  });

  return c.json({ message: "success" }, 200);
});

export const taskRoute = app
  .get("/", ...getHandler)
  .post("/", ...createHandler)
  .get("/:id", ...findHandler)
  .put("/:id", ...updateHandler)
  .delete("/:id", ...deleteHandler);

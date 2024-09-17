import { Hono } from "hono";
import { createFactory } from "hono/factory";

import { zValidator } from "@hono/zod-validator";

import { prisma } from "@/backend/lib/prisma";
import {
  CreateTaskRequest,
  createTaskRequestSchema,
} from "@/types/request/CreateTaskRequest";
import {
  UpdateTaskRequest,
  updateTaskRequestSchema,
} from "@/types/request/UpdateTaskRequest";
import {
  GetTasksResponse,
  GetTasksResponseSchema,
} from "@/types/response/GetTasksResponse";

import { JwtEnv } from "../middleware/authMiddleware";

const factory = createFactory<JwtEnv>();
const app = new Hono();

const getHandler = factory.createHandlers(async (c) => {
  const tasks: GetTasksResponse = await prisma.task.findMany({
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

  const parsedTasks = GetTasksResponseSchema.safeParse(tasks);
  if (!parsedTasks.success) {
    return c.json({ message: "failed to parse tasks" }, 500);
  }

  return c.json(parsedTasks.data, 200);
});

const findHandler = factory.createHandlers(async (c) => {
  const { id } = c.req.param();

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
    const json = await c.req.json<CreateTaskRequest>();

    try {
      const task = await prisma.task.create({
        data: {
          title: json.title,
          userId: c.get("jwtPayload").id,
        },
      });
      return c.json(task, 200);
    } catch (e) {
      console.log(e);
      return c.json({ message: "failed to create task" }, 500);
    }
  }
);

const updateHandler = factory.createHandlers(
  zValidator("json", updateTaskRequestSchema),
  async (c) => {
    const id = c.req.param("id");
    const json = await c.req.json<UpdateTaskRequest>();

    try {
      const task = await prisma.task.update({
        where: {
          id,
          userId: c.get("jwtPayload").id,
        },
        data: {
          ...json,
        },
      });

      return c.json(task, 200);
    } catch (e) {
      console.log(e);
      return c.json({ message: "task not found" }, 404);
    }
  }
);

const deleteHandler = factory.createHandlers(async (c) => {
  const id = c.req.param("id");

  try {
    await prisma.task.delete({
      where: {
        id,
        userId: c.get("jwtPayload").id,
      },
      forceDelete: false,
    });
    return c.json({ message: "success" }, 200);
  } catch (e) {
    console.log(e);
    return c.json({ message: "task not found" }, 404);
  }
});

const bulkDeleteDoneTaskHandler = factory.createHandlers(async (c) => {
  await prisma.task.deleteMany({
    where: {
      done: true,
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
  .delete("/:id", ...deleteHandler)
  .delete("/bulkDelete", ...bulkDeleteDoneTaskHandler);

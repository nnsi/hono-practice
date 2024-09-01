import { Hono } from "hono";
import { createFactory } from "hono/factory";
import { PrismaClient } from "@prisma/client";
import { CreateTaskRequest } from "@/types/request/CreateTaskRequest";
import { UpdateTaskRequest } from "@/types/request/UpdateTaskRequest";

const factory = createFactory();
const app = new Hono<{
  Variables: {
    id: string;
  };
}>();

const getHandler = factory.createHandlers(async (c) => {
  const prisma = new PrismaClient();
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
  });
  return c.json(tasks, 200);
});

const findHandler = factory.createHandlers(async (c) => {
  const { id } = c.req.param();
  const prisma = new PrismaClient();

  const task = await prisma.task.findFirst({
    select: {
      id: true,
      title: true,
      done: true,
      createdAt: true,
      updatedAt: true,
    },
    where: {
      id,
      userId: c.get("jwtPayload").id,
    },
  });

  return c.json(task, 200);
});

const createHandler = factory.createHandlers(async (c) => {
  const prisma = new PrismaClient();
  const json = await c.req.json<CreateTaskRequest>();

  const task = await prisma.task.create({
    data: {
      title: json.title,
      userId: c.get("jwtPayload").id,
    },
  });

  return c.json(task, 200);
});

const updateHandler = factory.createHandlers(async (c) => {
  const { id } = c.req.param();
  const prisma = new PrismaClient();
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

  return c.json(task, 200);
});

const deleteHandler = factory.createHandlers(async (c) => {
  const { id } = c.req.param();
  const prisma = new PrismaClient();

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

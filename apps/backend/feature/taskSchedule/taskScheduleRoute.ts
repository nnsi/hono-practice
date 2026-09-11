import { Hono } from "hono";

import { noopTracer } from "@backend/lib/tracer";
import { zValidator } from "@hono/zod-validator";
import { createTaskScheduleId } from "@packages/domain/taskSchedule/taskScheduleSchema";
import {
  CreateTaskScheduleRequestSchema,
  UpdateTaskScheduleRequestSchema,
} from "@packages/types/request";
import { z } from "zod";

import type { AppContext } from "../../context";
import { newActivityRepository } from "../activity/activityRepository";
import { newTaskScheduleHandler } from "./taskScheduleHandler";
import { newTaskScheduleRepository } from "./taskScheduleRepository";
import { newTaskScheduleUsecase } from "./taskScheduleUsecase";

export function createTaskScheduleRoute() {
  const app = new Hono<
    AppContext & {
      Variables: {
        h: ReturnType<typeof newTaskScheduleHandler>;
      };
    }
  >();

  app.use("*", async (c, next) => {
    const db = c.env.DB;

    const tracer = c.get("tracer") ?? noopTracer;
    const repo = newTaskScheduleRepository(db);
    const uc = newTaskScheduleUsecase(repo, newActivityRepository(db), tracer);
    const h = newTaskScheduleHandler(uc);

    c.set("h", h);

    return next();
  });

  return app
    .get("/", async (c) => {
      const userId = c.get("userId");
      const res = await c.var.h.getTaskSchedules(userId);
      return c.json(res);
    })
    .post(
      "/",
      zValidator("json", CreateTaskScheduleRequestSchema),
      async (c) => {
        const userId = c.get("userId");
        const params = c.req.valid("json");

        const res = await c.var.h.createTaskSchedule(userId, params);

        return c.json(res, 201);
      },
    )
    .put(
      "/:id",
      zValidator("param", z.object({ id: z.string().uuid() })),
      zValidator("json", UpdateTaskScheduleRequestSchema),
      async (c) => {
        const userId = c.get("userId");
        const { id } = c.req.param();
        const taskScheduleId = createTaskScheduleId(id);
        const params = c.req.valid("json");

        const res = await c.var.h.updateTaskSchedule(
          userId,
          taskScheduleId,
          params,
        );

        return c.json(res);
      },
    )
    .delete(
      "/:id",
      zValidator("param", z.object({ id: z.string().uuid() })),
      async (c) => {
        const userId = c.get("userId");
        const { id } = c.req.param();
        const taskScheduleId = createTaskScheduleId(id);

        const res = await c.var.h.deleteTaskSchedule(userId, taskScheduleId);

        return c.json(res);
      },
    );
}

export const newTaskScheduleRoute = createTaskScheduleRoute();

import { Hono } from "hono";

import type { AppContext } from "../../context";
import { noopTracer } from "../../lib/tracer";
import { SyncTasksRequestSchema } from "@packages/types-v2";

import { newTaskV2Handler } from "./taskV2Handler";
import { newTaskV2Repository } from "./taskV2Repository";
import { newTaskV2Usecase } from "./taskV2Usecase";

export function createTaskV2Route() {
  const app = new Hono<
    AppContext & {
      Variables: {
        h: ReturnType<typeof newTaskV2Handler>;
      };
    }
  >();

  app.use("*", async (c, next) => {
    const db = c.env.DB;
    const tracer = c.get("tracer") ?? noopTracer;

    const repo = newTaskV2Repository(db);
    const uc = newTaskV2Usecase(repo, tracer);
    const h = newTaskV2Handler(uc);

    c.set("h", h);

    return next();
  });

  return app
    .get("/tasks", async (c) => {
      const userId = c.get("userId");
      const since = c.req.query("since");
      const res = await c.var.h.getTasks(userId, since);
      return c.json(res);
    })
    .post("/tasks/sync", async (c) => {
      const body = await c.req.json();
      const parsed = SyncTasksRequestSchema.safeParse(body);
      if (!parsed.success) {
        return c.json(
          { message: "Invalid request", errors: parsed.error.issues },
          400,
        );
      }
      const { tasks: taskList } = parsed.data;
      const userId = c.get("userId");
      const res = await c.var.h.syncTasks(userId, taskList);
      return c.json(res);
    });
}

export const taskV2Route = createTaskV2Route();

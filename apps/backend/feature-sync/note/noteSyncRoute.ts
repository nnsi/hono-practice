import { Hono } from "hono";

import { zValidator } from "@hono/zod-validator";
import { SyncNotesRequestSchema } from "@packages/types";

import type { AppContext } from "../../context";
import { noopTracer } from "../../lib/tracer";
import { newNoteSyncHandler } from "./noteSyncHandler";
import { newNoteSyncRepository } from "./noteSyncRepository";
import { newNoteSyncUsecase } from "./noteSyncUsecase";

export function createNoteSyncRoute() {
  const app = new Hono<
    AppContext & {
      Variables: {
        h: ReturnType<typeof newNoteSyncHandler>;
      };
    }
  >();

  app.use("*", async (c, next) => {
    const db = c.env.DB;
    const tracer = c.get("tracer") ?? noopTracer;

    const repo = newNoteSyncRepository(db);
    const uc = newNoteSyncUsecase(repo, tracer);
    const h = newNoteSyncHandler(uc);

    c.set("h", h);

    return next();
  });

  return app
    .get("/notes", async (c) => {
      const userId = c.get("userId");
      const since = c.req.query("since");
      const res = await c.var.h.getNotes(userId, since);
      return c.json(res);
    })
    .post(
      "/notes/sync",
      zValidator("json", SyncNotesRequestSchema),
      async (c) => {
        const userId = c.get("userId");
        const { notes } = c.req.valid("json");
        const res = await c.var.h.syncNotes(userId, notes);
        return c.json(res);
      },
    );
}

export const noteSyncRoute = createNoteSyncRoute();

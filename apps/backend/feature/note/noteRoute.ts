import { Hono } from "hono";

import { noopTracer } from "@backend/lib/tracer";
import { zValidator } from "@hono/zod-validator";
import { createNoteId } from "@packages/domain/note/noteSchema";
import {
  createNoteRequestSchema,
  updateNoteRequestSchema,
} from "@packages/types/request";
import { z } from "zod";

import type { AppContext } from "../../context";
import { newNoteHandler } from "./noteHandler";
import { newNoteRepository } from "./noteRepository";
import { newNoteUsecase } from "./noteUsecase";

const getNotesQuerySchema = z.object({
  activityId: z.string().uuid().optional(),
});

export function createNoteRoute() {
  const app = new Hono<
    AppContext & {
      Variables: {
        h: ReturnType<typeof newNoteHandler>;
      };
    }
  >();

  app.use("*", async (c, next) => {
    const db = c.env.DB;

    const tracer = c.get("tracer") ?? noopTracer;
    const repo = newNoteRepository(db);
    const uc = newNoteUsecase(repo, tracer);
    const h = newNoteHandler(uc);

    c.set("h", h);

    return next();
  });

  return app
    .get("/", zValidator("query", getNotesQuerySchema), async (c) => {
      const userId = c.get("userId");
      const { activityId } = c.req.valid("query");
      const res = await c.var.h.getNotes(userId, activityId);
      return c.json(res);
    })
    .get("/:id", async (c) => {
      const userId = c.get("userId");
      const { id } = c.req.param();
      const noteId = createNoteId(id);

      const res = await c.var.h.getNote(userId, noteId);

      return c.json(res);
    })
    .post("/", zValidator("json", createNoteRequestSchema), async (c) => {
      const userId = c.get("userId");
      const params = c.req.valid("json");

      const res = await c.var.h.createNote(userId, params);

      return c.json(res, 201);
    })
    .put("/:id", zValidator("json", updateNoteRequestSchema), async (c) => {
      const userId = c.get("userId");
      const { id } = c.req.param();
      const noteId = createNoteId(id);
      const params = c.req.valid("json");

      const res = await c.var.h.updateNote(userId, noteId, params);

      return c.json(res);
    })
    .delete("/:id", async (c) => {
      const userId = c.get("userId");
      const { id } = c.req.param();
      const noteId = createNoteId(id);

      const res = await c.var.h.deleteNote(userId, noteId);

      return c.json(res);
    });
}

export const noteRoute = createNoteRoute();

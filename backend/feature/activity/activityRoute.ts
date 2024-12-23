import { Hono } from "hono";

import { zValidator } from "@hono/zod-validator";

import { drizzle, runInTx } from "@/backend/infra/drizzle";
import {
  CreateActivityRequestSchema,
  UpdateActivityRequestSchema,
} from "@/types/request";

import { AppContext } from "../../context";

import {
  newActivityHandler,
  newActivityRepository,
  newActivityUsecase,
} from ".";

const app = new Hono<AppContext>();

const repo = newActivityRepository(drizzle);
const uc = newActivityUsecase(repo, runInTx);
const h = newActivityHandler(uc);

export const newActivityRoute = app
  .get("/", (c) => h.getActivities(c))
  .get("/:id", (c) => h.getActivity(c, c.req.param("id")))
  .post("/", zValidator("json", CreateActivityRequestSchema), (c) =>
    h.createActivity(c, c.req.valid("json"))
  )
  .put("/:id", zValidator("json", UpdateActivityRequestSchema), (c) => {
    const { id } = c.req.param();

    return h.updateActivity(c, id, c.req.valid("json"));
  })
  .delete("/:id", (c) => h.deleteActivity(c, c.req.param("id")));

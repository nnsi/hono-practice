import { Hono } from "hono";

import { zValidator } from "@hono/zod-validator";

import { drizzle, newDrizzleTransactionRunner } from "@/backend/infra/drizzle";
import {
  CreateActivityRequestSchema,
  UpdateActivityOrderRequestSchema,
  UpdateActivityRequestSchema,
} from "@/types/request";

import { AppContext } from "../../context";
import { activityLogRoute } from "../activityLog";

import {
  newActivityHandler,
  newActivityRepository,
  newActivityUsecase,
} from ".";

const app = new Hono<AppContext>();

const repo = newActivityRepository(drizzle);
const tx = newDrizzleTransactionRunner(drizzle);
const uc = newActivityUsecase(repo, tx);
const h = newActivityHandler(uc);

export const newActivityRoute = app
  .get("/", (c) => h.getActivities(c))
  .get("/:id", (c) => h.getActivity(c, c.req.param("id")))
  .post("/", zValidator("json", CreateActivityRequestSchema), async (c) =>
    h.createActivity(c, c.req.valid("json"))
  )
  .put("/:id", zValidator("json", UpdateActivityRequestSchema), async (c) => {
    const { id } = c.req.param();
    return h.updateActivity(c, id, c.req.valid("json"));
  })
  .put(
    "/:id/order",
    zValidator("json", UpdateActivityOrderRequestSchema),
    async (c) => {
      const { id } = c.req.param();

      h.updateActivityOrder(c, id, c.req.valid("json"));
    }
  )
  .delete("/:id", (c) => h.deleteActivity(c, c.req.param("id")))
  .route("/:id/logs", activityLogRoute); // TODO: ActivityLogの実装終わったら消す

import { Context, Hono } from "hono";

import { zValidator } from "@hono/zod-validator";

import { drizzle, runInTx } from "@/backend/infra/drizzle";
import {
  CreateActivityRequestSchema,
  UpdateActivityRequestSchema,
} from "@/types/request";

import { AppContext } from "../../context";

import {
  ActivityRepository,
  newActivityHandler,
  newActivityRepository,
  newActivityUsecase,
} from ".";

const app = new Hono<
  AppContext & {
    Variables: {
      txActivityRepo?: ActivityRepository;
    };
  }
>();

export type WithTxActivityRepoContext = Context<
  AppContext & {
    Variables: {
      txActivityRepo?: ActivityRepository;
    };
  },
  any,
  {}
>;

const repo = newActivityRepository(drizzle);
const uc = newActivityUsecase(repo);
const h = newActivityHandler(uc);

export const newActivityRoute = app
  .get("/", (c) => h.getActivities(c))
  .get("/:id", (c) => h.getActivity(c, c.req.param("id")))
  .post("/", zValidator("json", CreateActivityRequestSchema), async (c) => {
    return await runInTx(async (txDb) => {
      const txRepo = newActivityRepository(txDb);

      c.set("txActivityRepo", txRepo);

      return h.createActivity(c, c.req.valid("json"));
    });
  })
  .put("/:id", zValidator("json", UpdateActivityRequestSchema), async (c) => {
    const { id } = c.req.param();
    return await runInTx(async (txDb) => {
      const txRepo = newActivityRepository(txDb);

      c.set("txActivityRepo", txRepo);

      return h.updateActivity(c, id, c.req.valid("json"));
    });
  })
  .delete("/:id", (c) => h.deleteActivity(c, c.req.param("id")));

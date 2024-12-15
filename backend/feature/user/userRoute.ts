import { Hono } from "hono";
import { createFactory } from "hono/factory";

import { zValidator } from "@hono/zod-validator";

import { newDrizzleTransactionAdapter } from "@/backend/infra/drizzleTransactionAdapter";
import { drizzle } from "@/backend/lib/drizzle";
import { newActivityQueryService } from "@/backend/query/activityStats";
import { createUserRequestSchema } from "@/types/request";

import { AppContext } from "../../context";
import { authMiddleware } from "../../middleware/authMiddleware";
import { newTaskRepository } from "../task";

import { newUserHandler, newUserUsecase, newUserRepository } from ".";

const factory = createFactory<AppContext>();
const app = new Hono();

const transaction = newDrizzleTransactionAdapter(drizzle);
const repo = newUserRepository(drizzle);
const taskRepo = newTaskRepository(drizzle);
const activityQuery = newActivityQueryService(drizzle);
const uc = newUserUsecase(repo, taskRepo, activityQuery, transaction);
const h = newUserHandler(uc);

export const userRoute = app
  .post(
    "/",
    ...factory.createHandlers(
      zValidator("json", createUserRequestSchema),
      (c) => h.createUser(c)
    )
  )
  .get("/dashboard", authMiddleware, ...factory.createHandlers(h.getDashboard))
  .get("/me", authMiddleware, ...factory.createHandlers(h.getMe));
